import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AiRouter } from '@ice/core';

const testProviderSchema = z.object({
  providerId: z.enum(['anthropic', 'openai', 'google', 'deepseek', 'qwen', 'ollama', 'openrouter']),
});

/**
 * Provider routes — Phase 4.5's exact requested surface:
 *   GET  /v1/providers         registry (id + available)
 *   GET  /v1/providers/status  live health per provider (Phase 4.5's
 *                              available/unavailable/auth_failed/
 *                              timeout/rate_limited vocabulary)
 *   GET  /v1/providers/models  same data as /v1/models — kept as a
 *                              separate path too since Flutter Settings
 *                              (Phase 4.5's stated future consumer)
 *                              expects it grouped under /providers
 *   POST /v1/providers/test    on-demand health check for ONE provider,
 *                              for a Settings "Test connection" button
 *
 * `/v1/providers/health` (Phase 4's original path) is kept working
 * unchanged below — Phase 4.5 adds `/status` alongside it rather than
 * silently breaking an existing consumer of `/health`.
 */
export function registerProviderRoutes(app: FastifyInstance, router: AiRouter): void {
  app.get('/providers', async (_request, reply) => {
    return reply.send({ providers: router.listProviders() });
  });

  app.get('/providers/health', async (_request, reply) => {
    return reply.send({ health: await router.healthCheckAll() });
  });

  app.get('/providers/status', async (_request, reply) => {
    return reply.send({ status: await router.healthCheckAll() });
  });

  app.post('/providers/test', async (request, reply) => {
    const parsed = testProviderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const result = await router.testProvider(parsed.data.providerId);
    if (!result) {
      return reply.code(404).send({
        error: { code: 'PROVIDER_NOT_FOUND', message: `Provider "${parsed.data.providerId}" is not registered.` },
      });
    }

    return reply.send({ result });
  });
}
