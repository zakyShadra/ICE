export interface ChatSession {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
}

export interface ChatMessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  providerUsed: string | null;
  createdAt: string;
}

export interface CreateSessionInput {
  userId: string;
  title?: string;
}

export interface RenameSessionInput {
  sessionId: string;
  userId: string;
  title: string;
}

/**
 * IChatRepository — Document 2, Section 4's persistence-boundary rule
 * applied to a backend-owned entity (chat sessions/messages are not
 * ICE Core concepts — Core's Brain only knows about Memory. Session
 * history is a product/backend concern, so its Repository interface
 * and implementation live here in apps/backend, not in packages/core).
 */
export interface IChatRepository {
  createSession(input: CreateSessionInput): Promise<ChatSession>;
  listSessions(userId: string): Promise<ChatSession[]>;
  getSession(sessionId: string, userId: string): Promise<ChatSession | null>;
  renameSession(input: RenameSessionInput): Promise<ChatSession>;
  deleteSession(sessionId: string, userId: string): Promise<void>;

  appendMessage(record: Omit<ChatMessageRecord, 'id' | 'createdAt'>): Promise<ChatMessageRecord>;
  listMessages(sessionId: string, userId: string): Promise<ChatMessageRecord[]>;
}

export class SessionNotFoundError extends Error {
  readonly code = 'SESSION_NOT_FOUND';
  constructor(sessionId: string) {
    super(`Chat session not found: ${sessionId}`);
  }
}
