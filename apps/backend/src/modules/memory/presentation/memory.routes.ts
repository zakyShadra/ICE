import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MemoryNotFoundError, type IMemory } from '@ice/core';

const memoryTypeEnum = z.enum(['session', 'long_term', 'project', 'knowledge']);

const storeMemorySchema = z.object({
  type: memoryTypeEnum,
  content: z.string().min(1).max(4000),
  projectId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).default({}),
});

const searchMemorySchema = z.object({
  query: z.string().min(1),
  types: z.array(memoryTypeEnum).default(['long_term', 'project']),
  projectId: z.string().uuid().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

/**
 * Memory routes — Document 1's "Memory: Store Memory / Search Memory /
 * Delete Memory" requirement, implemented as a thin REST wrapper
 * directly over Core's `IMemory` (exposed on Container per this
 * session's Phase 3 Part C wiring). Brain already writes Session
 * Memory automatically on every chat turn (Document 2, Section 5.1) —
 * these routes are for explicit, user- or client-initiated memory
 * operations (e.g., a future "remember this" action, or the Settings
 * memory viewer once its UI is built).
 */
export function registerMemoryRoutes(app: FastifyInstance, memory: IMemory): void {
  app.post('/memory', async (request, reply) => {
    const parsed = storeMemorySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const record = await memory.write({
      userId: request.user!.id,
      projectId: parsed.data.projectId,
      type: parsed.data.type,
      content: parsed.data.content,
      metadata: parsed.data.metadata,
      relevanceScore: 1,
    });

    return reply.code(201).send({ memory: record });
  });

  app.get('/memory/search', async (request, reply) => {
    const parsed = searchMemorySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const records = await memory.retrieveRelevant({
      userId: request.user!.id,
      projectId: parsed.data.projectId,
      types: parsed.data.types,
      queryText: parsed.data.query,
      limit: parsed.data.limit,
    });

    return reply.send({ memories: records });
  });

  app.delete<{ Params: { id: string } }>('/memory/:id', async (request, reply) => {
    try {
      await memory.delete(request.params.id, request.user!.id);
      return reply.code(204).send();
    } catch (error) {
      if (error instanceof MemoryNotFoundError) {
        return reply.code(404).send({ error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  });
}
