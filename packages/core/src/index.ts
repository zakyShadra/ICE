/**
 * @ice/core — public entry point.
 *
 * Only what's exported here is meant to be consumed by apps/backend's
 * DI composition root (Document 2, Section 7.2). Internal module
 * details stay internal.
 */

// Brain
export { Brain } from './brain/brain.js';

// Planner
export { Planner } from './planner/planner.js';
export type { PlanDecision } from './planner/planner.js';

// Memory
export type { IMemory } from './memory/memory.types.js';
export { InMemoryMemoryRepository } from './memory/in-memory-memory.repository.js';
export { PrismaMemoryRepository } from './memory/prisma-memory.repository.js';

// Context / Prompt
export {
  ContextBuilder,
} from './context/context-builder.js';
export type {
  BuiltContext,
  ContextBuilderCollaborators,
  IFileContextProvider,
  IProjectContextProvider,
  IUserProfileContextProvider,
} from './context/context-builder.js';
export { PromptBuilder } from './prompt/prompt-builder.js';

// Conversation
export { ConversationManager } from './conversation/conversation-manager.js';
export type { CompressionResult } from './conversation/conversation-manager.js';

// Router
export { AiRouter } from './router/ai-router.js';
export { CapabilityBasedStrategy } from './router/strategies.js';
export type {
  CompletionResult,
  IProviderAdapter,
  RoutingStrategy,
  StreamChunkHandler,
} from './router/router.types.js';
export { ModelRegistry } from './router/model-registry.js';
export { ProviderRegistry } from './router/provider-registry.js';
export { AnthropicProviderAdapter } from './router/providers/anthropic.provider.js';
export { OllamaProviderAdapter } from './router/providers/ollama.provider.js';
export { OpenAiProviderAdapter } from './router/providers/openai.provider.js';
export { GoogleProviderAdapter } from './router/providers/google.provider.js';
export { OpenRouterProviderAdapter } from './router/providers/openrouter.provider.js';

// Agent / Workflow
export { Agent } from './agent/agent.js';
export type { AgentStepPlan } from './agent/agent.js';
export { WorkflowEngine } from './agent/workflow-engine.js';

// Executor / Permission / Tools
export { Executor } from './executor/executor.js';
export type { ExecutionRequest } from './executor/executor.js';
export { PermissionManager } from './permission/permission-manager.js';
export type { PermissionDecision } from './permission/permission-manager.js';
export { ToolRegistry, textTruncateTool } from './tools/tool-registry.js';

// Observer
export { Observer } from './observer/observer.js';
export type { ObserverSink } from './observer/observer.js';

// Shared
export { IceEventBus } from './shared/events.js';
export type { IceEventMap, IceEventName } from './shared/events.js';
export {
  IceError,
  MemoryNotFoundError,
  PermissionDeniedError,
  ProviderUnavailableError,
  NoProviderAvailableError,
  ToolNotFoundError,
  ToolExecutionError,
} from './shared/errors.js';
