import type { PrismaClient } from '@prisma/client';
import {
  SessionNotFoundError,
  type ChatMessageRecord,
  type ChatSession,
  type CreateSessionInput,
  type IChatRepository,
  type RenameSessionInput,
} from '../domain/chat.types.js';

/**
 * PrismaChatRepository — Infrastructure layer, implements Document 3's
 * `sessions` / `messages` tables. The only file in the Chat module
 * allowed to import @prisma/client.
 */
export class PrismaChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async createSession(input: CreateSessionInput): Promise<ChatSession> {
    const record = await this.prisma.session.create({
      data: { userId: input.userId, title: input.title },
    });
    return this.sessionToDomain(record);
  }

  async listSessions(userId: string): Promise<ChatSession[]> {
    const records = await this.prisma.session.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.sessionToDomain(r));
  }

  async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const record = await this.prisma.session.findFirst({ where: { id: sessionId, userId } });
    return record ? this.sessionToDomain(record) : null;
  }

  async renameSession(input: RenameSessionInput): Promise<ChatSession> {
    const result = await this.prisma.session.updateMany({
      where: { id: input.sessionId, userId: input.userId },
      data: { title: input.title },
    });
    if (result.count === 0) throw new SessionNotFoundError(input.sessionId);
    const updated = await this.prisma.session.findUniqueOrThrow({ where: { id: input.sessionId } });
    return this.sessionToDomain(updated);
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const result = await this.prisma.session.deleteMany({ where: { id: sessionId, userId } });
    if (result.count === 0) throw new SessionNotFoundError(sessionId);
  }

  async appendMessage(
    record: Omit<ChatMessageRecord, 'id' | 'createdAt'>,
  ): Promise<ChatMessageRecord> {
    const created = await this.prisma.message.create({
      data: {
        sessionId: record.sessionId,
        role: record.role,
        content: record.content,
        providerUsed: record.providerUsed ?? undefined,
      },
    });
    return this.messageToDomain(created);
  }

  async listMessages(sessionId: string, userId: string): Promise<ChatMessageRecord[]> {
    // Scoped through the parent session's userId, per Document 3,
    // Section 4.1's RLS intent — even though this is app-level access
    // control, not RLS itself, the same scoping discipline applies.
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new SessionNotFoundError(sessionId);

    const records = await this.prisma.message.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return records.map((r) => this.messageToDomain(r));
  }

  private sessionToDomain(record: { id: string; userId: string; title: string | null; createdAt: Date }): ChatSession {
    return { id: record.id, userId: record.userId, title: record.title, createdAt: record.createdAt.toISOString() };
  }

  private messageToDomain(record: {
    id: string;
    sessionId: string;
    role: string;
    content: string;
    providerUsed: string | null;
    createdAt: Date;
  }): ChatMessageRecord {
    return {
      id: record.id,
      sessionId: record.sessionId,
      role: record.role as ChatMessageRecord['role'],
      content: record.content,
      providerUsed: record.providerUsed,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
