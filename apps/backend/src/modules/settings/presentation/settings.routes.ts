import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { SettingsService } from '../application/settings.service.js';

const providerEnum = z.enum(['anthropic', 'openai', 'google', 'deepseek', 'qwen', 'ollama', 'openrouter']);

const updateSettingsSchema = z.object({
  enabledProviders: z.array(providerEnum).min(1).optional(),
  defaultRoutingMode: z.union([z.literal('auto'), providerEnum]).optional(),
  memoryVisibilityOptIn: z.boolean().optional(),
});

export function registerSettingsRoutes(app: FastifyInstance, settingsService: SettingsService): void {
  app.get('/settings', async (request, reply) => {
    const settings = await settingsService.getOrDefault(request.user!.id);
    return reply.send({ settings });
  });

  app.patch('/settings', async (request, reply) => {
    const parsed = updateSettingsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }
    const settings = await settingsService.update(request.user!.id, parsed.data);
    return reply.send({ settings });
  });
}
