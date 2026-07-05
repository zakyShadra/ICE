import type { FastifyInstance } from 'fastify';
import type { ModelRegistry } from '@ice/core';

/**
 * Model registry routes — Document 1's "Model Registry" requirement.
 * `/v1/models` (Phase 4) and `/v1/providers/models` (Phase 4.5's exact
 * requested path, grouped for the future Flutter Settings screen) both
 * return the same data — read-only, since models are registered in
 * code (ModelRegistry), not user-editable.
 */
export function registerModelRoutes(app: FastifyInstance, modelRegistry: ModelRegistry): void {
  app.get('/models', async (_request, reply) => {
    return reply.send({ models: modelRegistry.list() });
  });

  app.get('/providers/models', async (_request, reply) => {
    return reply.send({ models: modelRegistry.list() });
  });
}
