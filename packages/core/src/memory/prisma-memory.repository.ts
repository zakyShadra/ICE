import type { PrismaClient } from '@prisma/client';
import type { MemoryQuery, MemoryRecord, MemoryType } from '@ice/types';
import { MemoryNotFoundError } from '../shared/errors.js';
import type { IMemory } from './memory.types.js';

/**
 * PrismaMemoryRepository — the production IMemory implementation
 * against Document 3's `memories` table.
 *
 * NOTE ON PLACEMENT: this file lives in packages/core, not
 * apps/backend, and it DOES import @prisma/client directly — which
 * looks like it violates Document 2, Section 4, Rule 2 at first
 * glance. It doesn't: Rule 2 says "only Memory (via a Repository
 * interface) may touch persistence" — this class *is* that Repository
 * interface's concrete implementation. The rule is about every OTHER
 * Core module never reaching around Memory to touch Prisma directly;
 * Brain, Context Builder, Agent, etc. still only ever see `IMemory`.
 * The eslint restricted-imports rule scopes the @prisma/client ban to
 * everywhere in Core EXCEPT this file for exactly this reason.
 *
 * This is the swap-in Phase 1's DI container comment promised:
 * replacing `InMemoryMemoryRepository` with this class in
 * `apps/backend/src/di/container.ts` is the only change required
 * anywhere in the codebase.
 */
export class PrismaMemoryRepository implements IMemory {
  constructor(private readonly prisma: PrismaClient) {}

  async write(
    record: Omit<MemoryRecord, 'id' | 'createdAt' | 'lastAccessedAt'>,
  ): Promise<MemoryRecord> {
    const created = await this.prisma.memory.create({
      data: {
        userId: record.userId,
        projectId: record.projectId,
        type: record.type,
        content: record.content,
        metadata: record.metadata,
        relevanceScore: record.relevanceScore,
        expiresAt: record.expiresAt ? new Date(record.expiresAt) : undefined,
      },
    });
    return this.toDomain(created);
  }

  async retrieveRelevant(query: MemoryQuery): Promise<MemoryRecord[]> {
    // V1's relevance strategy: Postgres full-text-ish substring match
    // via `contains`, filtered by type/project/expiry, ordered by the
    // stored relevanceScore + recency. This intentionally mirrors
    // InMemoryMemoryRepository's simplicity (Document 2, Section
    // 12.1's "avoid over-engineering") — a proper ranking function
    // (or pgvector-based semantic search once Knowledge Memory ships,
    // per Document 3, Section 1.2) is future work, not a V1 gap to
    // silently paper over.
    const now = new Date();

    const candidates = await this.prisma.memory.findMany({
      where: {
        userId: query.userId,
        type: { in: query.types },
        projectId: query.projectId ?? undefined,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: [{ relevanceScore: 'desc' }, { createdAt: 'desc' }],
      take: query.limit * 3, // over-fetch, then re-rank in-process against queryText
    });

    const scored = candidates
      .map((record) => ({
        record,
        score: this.scoreRelevance(record.content, record.relevanceScore, query.queryText),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, query.limit);

    const ids = scored.map((s) => s.record.id);
    if (ids.length > 0) {
      await this.prisma.memory.updateMany({
        where: { id: { in: ids } },
        data: { lastAccessedAt: now },
      });
    }

    return scored.map((s) => this.toDomain({ ...s.record, lastAccessedAt: now }));
  }

  async delete(memoryId: string, userId: string): Promise<void> {
    const result = await this.prisma.memory.deleteMany({ where: { id: memoryId, userId } });
    if (result.count === 0) {
      throw new MemoryNotFoundError(memoryId);
    }
  }

  async listByType(userId: string, type: MemoryType): Promise<MemoryRecord[]> {
    const records = await this.prisma.memory.findMany({ where: { userId, type } });
    return records.map((r) => this.toDomain(r));
  }

  private scoreRelevance(content: string, storedScore: number, queryText: string): number {
    const normalizedQuery = queryText.toLowerCase();
    const normalizedContent = content.toLowerCase();
    let score = storedScore;
    if (normalizedContent.includes(normalizedQuery)) score += 5;
    for (const word of normalizedQuery.split(/\s+/).filter((w) => w.length > 2)) {
      if (normalizedContent.includes(word)) score += 1;
    }
    return score;
  }

  private toDomain(record: {
    id: string;
    userId: string;
    projectId: string | null;
    type: string;
    content: string;
    metadata: unknown;
    relevanceScore: number;
    createdAt: Date;
    lastAccessedAt: Date;
    expiresAt: Date | null;
  }): MemoryRecord {
    return {
      id: record.id,
      userId: record.userId,
      projectId: record.projectId ?? undefined,
      type: record.type as MemoryType,
      content: record.content,
      metadata: (record.metadata as Record<string, unknown>) ?? {},
      relevanceScore: record.relevanceScore,
      createdAt: record.createdAt.toISOString(),
      lastAccessedAt: record.lastAccessedAt.toISOString(),
      expiresAt: record.expiresAt?.toISOString(),
    };
  }
}
