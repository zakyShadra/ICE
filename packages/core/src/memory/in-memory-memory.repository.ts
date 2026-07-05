import { randomUUID } from 'node:crypto';
import type { MemoryQuery, MemoryRecord, MemoryType } from '@ice/types';
import { MemoryNotFoundError } from '../shared/errors.js';
import type { IMemory } from './memory.types.js';

/**
 * In-process implementation of IMemory.
 *
 * This is REAL, working code — not a placeholder. It's the correct
 * implementation to wire up for local development and for backend unit
 * tests (Document 2, Section 6.3: tests wire in fakes; production wires
 * in real implementations). The production Postgres-backed implementation
 * (satisfying the same IMemory interface, per Document 3's schema) is a
 * planned, separate class — swapping it in later requires zero changes
 * to Brain, Context Builder, or anything else that depends on IMemory.
 *
 * Relevance scoring here is intentionally simple (substring + recency)
 * because the point of V1's Memory module is proving the retrieval
 * *contract* end-to-end, per Document 1's Milestone 2 goal — not yet
 * shipping a sophisticated ranking algorithm.
 */
export class InMemoryMemoryRepository implements IMemory {
  private readonly records = new Map<string, MemoryRecord>();

  async write(
    record: Omit<MemoryRecord, 'id' | 'createdAt' | 'lastAccessedAt'>,
  ): Promise<MemoryRecord> {
    const now = new Date().toISOString();
    const full: MemoryRecord = {
      ...record,
      id: randomUUID(),
      createdAt: now,
      lastAccessedAt: now,
    };
    this.records.set(full.id, full);
    return full;
  }

  async retrieveRelevant(query: MemoryQuery): Promise<MemoryRecord[]> {
    const candidates = [...this.records.values()].filter((record) => {
      if (record.userId !== query.userId) return false;
      if (!query.types.includes(record.type)) return false;
      if (query.projectId && record.projectId !== query.projectId) return false;
      if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) return false;
      return true;
    });

    const scored = candidates.map((record) => ({
      record,
      score: this.scoreRelevance(record, query.queryText),
    }));

    scored.sort((a, b) => b.score - a.score);

    const results = scored.slice(0, query.limit).map((s) => s.record);

    // Retrieval updates lastAccessedAt — this is what lets a future decay
    // strategy (Document 3, Section 6) distinguish "stale" from "unused."
    const now = new Date().toISOString();
    for (const record of results) {
      record.lastAccessedAt = now;
    }

    return results;
  }

  async delete(memoryId: string, userId: string): Promise<void> {
    const record = this.records.get(memoryId);
    if (!record || record.userId !== userId) {
      throw new MemoryNotFoundError(memoryId);
    }
    this.records.delete(memoryId);
  }

  async listByType(userId: string, type: MemoryType): Promise<MemoryRecord[]> {
    return [...this.records.values()].filter(
      (record) => record.userId === userId && record.type === type,
    );
  }

  private scoreRelevance(record: MemoryRecord, queryText: string): number {
    const normalizedQuery = queryText.toLowerCase();
    const normalizedContent = record.content.toLowerCase();

    let score = record.relevanceScore ?? 0;

    if (normalizedContent.includes(normalizedQuery)) {
      score += 5;
    }

    const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
    for (const word of queryWords) {
      if (word.length > 2 && normalizedContent.includes(word)) {
        score += 1;
      }
    }

    // Mild recency bonus — recently created memories rank slightly higher
    // when relevance is otherwise tied.
    const ageMs = Date.now() - new Date(record.createdAt).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    score += Math.max(0, 2 - ageDays * 0.05);

    return score;
  }
}
