import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProfileNotFoundError } from '../application/profile.service.js';
import type { ProfileService } from '../application/profile.service.js';

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(80).optional(),
});

export function registerProfileRoutes(app: FastifyInstance, profileService: ProfileService): void {
  app.get('/profile', async (request, reply) => {
    try {
      const profile = await profileService.getProfile(request.user!.id);
      return reply.send({ profile });
    } catch (error) {
      if (error instanceof ProfileNotFoundError) {
        return reply.code(404).send({ error: { code: error.code, message: error.message } });
      }
      throw error;
    }
  });

  app.patch('/profile', async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    const profile = await profileService.updateProfile(request.user!.id, parsed.data);
    return reply.send({ profile });
  });
}
