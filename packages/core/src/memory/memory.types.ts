import type { MemoryQuery, MemoryRecord, MemoryType } from '@ice/types';

/**
 * IMemory — the only interface the rest of Core is allowed to depend on.
 *
 * Per Document 2, Section 4, Rule 2: only Memory (via a Repository
 * interface) may touch persistence. Brain, Context Builder, and everyone
 * else depend on this interface, never on a concrete Postgres/Prisma
 * implementation. See Document 3 for the underlying schema this is
 * designed to sit in front of.
 */
export interface IMemory {
  write(record: Omit<MemoryRecord, 'id' | 'createdAt' | 'lastAccessedAt'>): Promise<MemoryRecord>;
  retrieveRelevant(query: MemoryQuery): Promise<MemoryRecord[]>;
  delete(memoryId: string, userId: string): Promise<void>;
  listByType(userId: string, type: MemoryType): Promise<MemoryRecord[]>;
}
