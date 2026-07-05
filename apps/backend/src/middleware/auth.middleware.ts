import type { FastifyReply, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { IceConfig } from '@ice/config';
import type { AuthenticatedUser } from '@ice/types';

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

/**
 * Auth middleware — Document 2, Section 7.3 / Document 3, Section 5.
 * Verifies the Supabase-issued JWT via Supabase's JWKS endpoint (cached
 * by `jose`'s createRemoteJWKSet — a local cryptographic check per
 * request, not a database round-trip, per Document 3, Section 5.2).
 *
 * Supabase remains the single source of identity truth: this backend
 * verifies tokens, it never issues them.
 */
export function createAuthMiddleware(config: IceConfig) {
  const jwks = createRemoteJWKSet(new URL(`${config.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      await reply.code(401).send({ error: { code: 'UNAUTHENTICATED', message: 'Missing bearer token.' } });
      return;
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: `${config.SUPABASE_URL}/auth/v1`,
      });

      if (!payload.sub || typeof payload.email !== 'string') {
        throw new Error('Token payload missing required claims (sub, email).');
      }

      request.user = { id: payload.sub, email: payload.email };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await reply
        .code(401)
        .send({ error: { code: 'INVALID_TOKEN', message: `Token verification failed: ${message}` } });
    }
  };
}
