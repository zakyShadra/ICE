import type { Brain } from '@ice/core';
import type { ChatTurnResponse, NeutralPromptMessage, ProviderId } from '@ice/types';
import type {
  ChatMessageRecord,
  ChatSession,
  IChatRepository,
} from '../domain/chat.types.js';

/**
 * ChatService — Application layer. The seam between ICE Core (Brain —
 * cognition) and the backend's own persistence (Chat sessions/message
 * history). Phase 4 addition: `sendMessage`/`sendMessageStream` now
 * fetch real prior history and pass it to Brain so multi-turn context
 * actually reaches the model (Document 2's Conversation Manager,
 * PromptBuilder extensions) — previously each turn only had Memory's
 * summarized context, not the raw recent exchange.
 */
export class ChatService {
  constructor(
    private readonly repository: IChatRepository,
    private readonly brain: Brain,
  ) {}

  createSession(userId: string, title?: string): Promise<ChatSession> {
    return this.repository.createSession({ userId, title });
  }

  listSessions(userId: string): Promise<ChatSession[]> {
    return this.repository.listSessions(userId);
  }

  renameSession(sessionId: string, userId: string, title: string): Promise<ChatSession> {
    return this.repository.renameSession({ sessionId, userId, title });
  }

  deleteSession(sessionId: string, userId: string): Promise<void> {
    return this.repository.deleteSession(sessionId, userId);
  }

  getHistory(sessionId: string, userId: string): Promise<ChatMessageRecord[]> {
    return this.repository.listMessages(sessionId, userId);
  }

  async sendMessage(params: {
    userId: string;
    sessionId: string;
    input: string;
    preferredProvider?: ProviderId;
  }): Promise<{ userMessage: ChatMessageRecord; assistantMessage: ChatMessageRecord; router: ChatTurnResponse['routerMetadata'] }> {
    const conversationHistory = await this.loadHistoryAsNeutralMessages(params.sessionId, params.userId);

    const userMessage = await this.repository.appendMessage({
      sessionId: params.sessionId,
      role: 'user',
      content: params.input,
      providerUsed: null,
    });

    const turnResult = await this.brain.handleTurn({
      userId: params.userId,
      sessionId: params.sessionId,
      input: params.input,
      preferredProvider: params.preferredProvider,
      conversationHistory,
    });

    const assistantMessage = await this.repository.appendMessage({
      sessionId: params.sessionId,
      role: 'assistant',
      content: turnResult.message.content,
      providerUsed: turnResult.message.providerUsed ?? null,
    });

    return { userMessage, assistantMessage, router: turnResult.routerMetadata };
  }

  /**
   * Streaming variant — Phase 4's Streaming Engine. Same history
   * loading and persistence as `sendMessage`; forwards chunks to the
   * caller (the SSE route handler) as they arrive from Brain/Router.
   */
  async sendMessageStream(params: {
    userId: string;
    sessionId: string;
    input: string;
    preferredProvider?: ProviderId;
    onChunk: (text: string) => void;
  }): Promise<{ userMessage: ChatMessageRecord; assistantMessage: ChatMessageRecord; router: ChatTurnResponse['routerMetadata'] }> {
    const conversationHistory = await this.loadHistoryAsNeutralMessages(params.sessionId, params.userId);

    const userMessage = await this.repository.appendMessage({
      sessionId: params.sessionId,
      role: 'user',
      content: params.input,
      providerUsed: null,
    });

    const turnResult = await this.brain.handleTurnStream(
      {
        userId: params.userId,
        sessionId: params.sessionId,
        input: params.input,
        preferredProvider: params.preferredProvider,
        conversationHistory,
      },
      params.onChunk,
    );

    const assistantMessage = await this.repository.appendMessage({
      sessionId: params.sessionId,
      role: 'assistant',
      content: turnResult.message.content,
      providerUsed: turnResult.message.providerUsed ?? null,
    });

    return { userMessage, assistantMessage, router: turnResult.routerMetadata };
  }

  private async loadHistoryAsNeutralMessages(
    sessionId: string,
    userId: string,
  ): Promise<NeutralPromptMessage[]> {
    const history = await this.repository.listMessages(sessionId, userId).catch(() => []);
    return history.map((m) => ({ role: m.role, content: m.content }));
  }
}
