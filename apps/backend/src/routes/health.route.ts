import type { FastifyInstance } from 'fastify';
import type { Container } from '../di/container.js';

/**
 * Health route — Document 1's Milestone 6 ("launch readiness") and
 * standard operational practice: a lightweight, unauthenticated
 * endpoint for load balancers / uptime checks. Also verifies the
 * database connection is actually reachable, not just that the process
 * is up — a process that's "running" but can't reach Postgres should
 * report unhealthy, not healthy.
 */
export function registerHealthRoute(app: FastifyInstance, container: Container): void {
  app.get('/health', async (_request, reply) => {
    try {
      await container.prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'ok', database: 'connected' });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return reply.code(503).send({ status: 'degraded', database: 'unreachable', detail: message });
    }
  });
}
