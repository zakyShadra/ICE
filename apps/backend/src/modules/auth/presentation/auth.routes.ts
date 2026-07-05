import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { IdentityProviderError } from '../domain/auth.types.js';
import type { AuthService } from '../application/auth.service.js';

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/**
 * Auth routes — Presentation layer. Thin per Document 2, Section 7.2:
 * validate -> call one AuthService method -> serialize. Registered
 * WITHOUT the auth middleware (these are the endpoints that establish
 * auth in the first place) except `/v1/auth/me` and `/v1/auth/logout`,
 * which require an existing session.
 */
export function registerAuthRoutes(app: FastifyInstance, authService: AuthService): void {
  app.post('/auth/register', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    try {
      const session = await authService.register(parsed.data);
      return reply.code(201).send({ session });
    } catch (error) {
      return handleIdentityError(error, reply);
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    try {
      const session = await authService.login(parsed.data);
      return reply.send({ session });
    } catch (error) {
      return handleIdentityError(error, reply);
    }
  });

  app.post('/auth/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    try {
      const session = await authService.refresh({ refreshToken: parsed.data.refreshToken });
      return reply.send({ session });
    } catch (error) {
      return handleIdentityError(error, reply);
    }
  });
}

/**
 * Registered separately because these two DO require the standard
 * auth middleware (Document 2, Section 7.2) — split here rather than
 * conditionally checking inside one handler, so route-level auth
 * requirements stay declarative and visible in routes/index.ts.
 */
export function registerAuthenticatedAuthRoutes(app: FastifyInstance, authService: AuthService): void {
  app.post('/auth/logout', async (request, reply) => {
    const authHeader = request.headers.authorization!;
    const token = authHeader.slice('Bearer '.length);
    await authService.logout(token);
    return reply.code(204).send();
  });

  app.get('/auth/me', async (request, reply) => {
    return reply.send({ user: request.user });
  });
}

function handleIdentityError(error: unknown, reply: import('fastify').FastifyReply) {
  if (error instanceof IdentityProviderError) {
    return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message } });
  }
  throw error; // falls through to the centralized error handler
}
