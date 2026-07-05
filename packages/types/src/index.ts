/**
 * @ice/types — Shared domain contracts.
 *
 * Per Document 2, Section 2.2: this is the single source of truth for
 * shapes shared between @ice/core, the backend, and (via @ice/sdk) every
 * client. If backend and core both need a "ChatMessage" shape, it is
 * defined once, here — not duplicated and kept in sync by hand.
 */

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  id: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Chat / Messages
// ---------------------------------------------------------------------------

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  providerUsed?: string;
  createdAt: string;
}

export interface ChatTurnRequest {
  userId: string;
  sessionId: string;
  projectId?: string;
  input: string;
  /** Explicit provider override — if omitted, the Router decides. */
  preferredProvider?: ProviderId;
  /** Prior turns in this conversation, oldest first — Phase 4's Conversation Manager compresses these if needed. */
  conversationHistory?: NeutralPromptMessage[];
}

export interface ChatTurnResponse {
  message: ChatMessage;
  routerMetadata: RouterMetadata;
}

// ---------------------------------------------------------------------------
// Memory
// ---------------------------------------------------------------------------

export type MemoryType = 'session' | 'long_term' | 'project' | 'knowledge';

export interface MemoryRecord {
  id: string;
  userId: string;
  projectId?: string;
  type: MemoryType;
  content: string;
  metadata: Record<string, unknown>;
  relevanceScore: number;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt?: string;
}

export interface MemoryQuery {
  userId: string;
  projectId?: string;
  types: MemoryType[];
  queryText: string;
  limit: number;
}

// ---------------------------------------------------------------------------
// AI Router
// ---------------------------------------------------------------------------

export type ProviderId = 'anthropic' | 'openai' | 'google' | 'deepseek' | 'qwen' | 'ollama' | 'openrouter';

export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsToolCalling: boolean;
  supportsEmbeddings: boolean;
}

export interface ModelMetadata extends ModelCapabilities {
  provider: ProviderId;
  modelName: string;
  contextWindow: number;
}

export type ProviderHealthStatus =
  | 'available'
  | 'unavailable'
  | 'auth_failed'
  | 'timeout'
  | 'rate_limited';

export interface ProviderHealth {
  providerId: ProviderId;
  configured: boolean;
  status: ProviderHealthStatus;
  reachable: boolean | null; // retained for Phase 4 callers; null = not checked
  checkedAt: string;
  detail?: string;
}

export type StreamEventType = 'start' | 'chunk' | 'complete' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  content?: string; // present on 'chunk'
  fullContent?: string; // present on 'complete'
  metadata?: RouterMetadata; // present on 'complete'
  error?: IceErrorShape; // present on 'error'
}

export type TaskType = 'chat' | 'coding' | 'agent_step' | 'summarization';

export interface NeutralPromptMessage {
  role: MessageRole;
  content: string;
}

export interface RouterRequest {
  taskType: TaskType;
  messages: NeutralPromptMessage[];
  preferredProvider?: ProviderId;
}

export interface RouterMetadata {
  providerUsed: ProviderId;
  selectionReason: string;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
}

export interface RouterResponse {
  content: string;
  metadata: RouterMetadata;
}

// ---------------------------------------------------------------------------
// Agent / Workflow
// ---------------------------------------------------------------------------

export type AgentStepStatus =
  | 'pending'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'denied';

export interface AgentStep {
  id: string;
  taskId: string;
  stepIndex: number;
  status: AgentStepStatus;
  toolName: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  executedAt?: string;
}

export interface AgentTask {
  id: string;
  userId: string;
  projectId?: string;
  goal: string;
  steps: AgentStep[];
  status: 'planning' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
}

// ---------------------------------------------------------------------------
// Tools
// ---------------------------------------------------------------------------

export interface ToolDefinition<Input = Record<string, unknown>, Output = Record<string, unknown>> {
  name: string;
  description: string;
  isDestructive: boolean;
  execute: (input: Input) => Promise<Output>;
}

// ---------------------------------------------------------------------------
// Result type — used throughout Core instead of throwing for expected failures
// ---------------------------------------------------------------------------

export type Result<T, E = IceErrorShape> = { ok: true; value: T } | { ok: false; error: E };

export interface IceErrorShape {
  code: string;
  message: string;
}

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends IceErrorShape>(error: E): Result<never, E> {
  return { ok: false, error };
}
