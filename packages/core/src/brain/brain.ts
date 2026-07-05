import type { ChatMessage, ChatTurnRequest, ChatTurnResponse } from '@ice/types';
import { randomUUID } from 'node:crypto';
import type { AiRouter } from '../router/ai-router.js';
import type { ContextBuilder } from '../context/context-builder.js';
import type { PromptBuilder } from '../prompt/prompt-builder.js';
import type { IMemory } from '../memory/memory.types.js';
import type { Agent } from '../agent/agent.js';
import type { Planner } from '../planner/planner.js';
import type { IceEventBus } from '../shared/events.js';
import type { ConversationManager } from '../conversation/conversation-manager.js';

/**
 * Brain — Document 2, Section 3.1: the orchestrator/entry point for a
 * single user turn. Coordinates Planner, Context Builder, Memory,
 * Prompt Builder, Router, Agent, and (Phase 4) Conversation Manager —
 * and is the ONLY module the backend's controllers are allowed to call
 * into (Document 2, Section 7.2).
 *
 * This is the literal implementation of the data flow diagrammed in
 * Document 2, Section 5.1, extended by Phase 4's Streaming Engine
 * (`handleTurnStream`) and context-window management.
 */
export class Brain {
  constructor(
    private readonly planner: Planner,
    private readonly contextBuilder: ContextBuilder,
    private readonly promptBuilder: PromptBuilder,
    private readonly router: AiRouter,
    private readonly memory: IMemory,
    private readonly agent: Agent,
    private readonly events: IceEventBus,
    private readonly conversationManager: ConversationManager,
  ) {}

  async handleTurn(request: ChatTurnRequest): Promise<ChatTurnResponse> {
    const startedAt = Date.now();

    const decision = this.planner.plan(request.input);
    if (decision.kind === 'agent_task') {
      return this.handleAgentTurn(request, decision.goal, decision.steps);
    }

    const prompt = await this.buildPromptForTurn(request);

    const routerResponse = await this.router.route({
      taskType: 'chat',
      messages: prompt,
      preferredProvider: request.preferredProvider,
    });

    await this.recordTurn(request, routerResponse.content);

    const message = this.toAssistantMessage(request, routerResponse.content, routerResponse.metadata.providerUsed);

    this.events.emit('turn.completed', {
      userId: request.userId,
      sessionId: request.sessionId,
      providerUsed: routerResponse.metadata.providerUsed,
      latencyMs: Date.now() - startedAt,
    });

    return { message, routerMetadata: routerResponse.metadata };
  }

  /**
   * Streaming variant — Phase 4's Streaming Engine. Same planning,
   * context, and prompt assembly as `handleTurn`; the only difference
   * is calling `router.routeStream` and forwarding chunks to the
   * caller as they arrive. Persists memory and returns the final
   * response the same way, so callers that don't care about streaming
   * can ignore `onChunk` entirely and treat this identically to
   * `handleTurn`.
   */
  async handleTurnStream(
    request: ChatTurnRequest,
    onChunk: (text: string) => void,
  ): Promise<ChatTurnResponse> {
    const startedAt = Date.now();

    const decision = this.planner.plan(request.input);
    if (decision.kind === 'agent_task') {
      return this.handleAgentTurn(request, decision.goal, decision.steps);
    }

    const prompt = await this.buildPromptForTurn(request);

    const routerResponse = await this.router.routeStream(
      { taskType: 'chat', messages: prompt, preferredProvider: request.preferredProvider },
      onChunk,
    );

    await this.recordTurn(request, routerResponse.content);

    const message = this.toAssistantMessage(request, routerResponse.content, routerResponse.metadata.providerUsed);

    this.events.emit('turn.completed', {
      userId: request.userId,
      sessionId: request.sessionId,
      providerUsed: routerResponse.metadata.providerUsed,
      latencyMs: Date.now() - startedAt,
    });

    return { message, routerMetadata: routerResponse.metadata };
  }

  private async buildPromptForTurn(request: ChatTurnRequest) {
    const { recentMessages, summary } = await this.conversationManager.manageContextWindow(
      request.conversationHistory ?? [],
    );

    const context = await this.contextBuilder.buildContext({
      userId: request.userId,
      projectId: request.projectId,
      sessionId: request.sessionId,
      inputText: request.input,
      conversationHistory: recentMessages,
      conversationSummary: summary,
    });

    return this.promptBuilder.buildPrompt({ context, userInput: request.input });
  }

  private async recordTurn(request: ChatTurnRequest, responseContent: string): Promise<void> {
    // Persist this turn as Session Memory — Document 1's smallest
    // possible "second conversation is better than the first" bar
    // (Section 2.4) starts with every turn being written back.
    await this.memory.write({
      userId: request.userId,
      type: 'session',
      content: `User asked: "${request.input}". ICE replied: "${responseContent}"`,
      metadata: { sessionId: request.sessionId },
      relevanceScore: 1,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24h TTL
    });
  }

  private toAssistantMessage(request: ChatTurnRequest, content: string, providerUsed: string): ChatMessage {
    return {
      id: randomUUID(),
      sessionId: request.sessionId,
      role: 'assistant',
      content,
      providerUsed,
      createdAt: new Date().toISOString(),
    };
  }

  private async handleAgentTurn(
    request: ChatTurnRequest,
    goal: string,
    steps: Parameters<Agent['startTask']>[0]['plan'],
  ): Promise<ChatTurnResponse> {
    const task = this.agent.startTask({ userId: request.userId, goal, plan: steps });

    // V1's Agent Mode is supervised (PRD Principle #5): non-destructive
    // steps run immediately, destructive ones stop and surface a
    // confirmation requirement rather than guessing consent.
    const executedStep = await this.agent.runNextStep(task.id, false);

    const summary =
      executedStep.status === 'completed'
        ? `Task started. Step "${executedStep.toolName}" completed: ${JSON.stringify(executedStep.output)}`
        : `Task started. Step "${executedStep.toolName}" is ${executedStep.status} and needs your attention.`;

    const message: ChatMessage = {
      id: randomUUID(),
      sessionId: request.sessionId,
      role: 'assistant',
      content: summary,
      createdAt: new Date().toISOString(),
    };

    return {
      message,
      routerMetadata: {
        providerUsed: 'anthropic',
        selectionReason: 'agent_task_no_model_call_this_step',
        latencyMs: 0,
      },
    };
  }
}
