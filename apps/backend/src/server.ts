import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { loadConfig } from './config/index.js';
import { createLogger } from './logging/logger.js';
import { buildContainer } from './di/container.js';
import { registerRoutes } from './routes/index.js';
import { createErrorHandler } from './middleware/error-handler.js';

/**
 * Server bootstrap — Document 2, Section 7.1. Deliberately thin: load
 * config, build the logger, build the DI container, register plugins
 * and routes, start listening. No business logic lives here, and
 * nothing here is imported by anything in packages/core, keeping the
 * dependency direction from Document 2, Section 4 intact.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger(config);
  const container = buildContainer(config, logger);

  const app = Fastify({ logger: false }); // pino instance is managed separately for full control

  await app.register(cors, { origin: true });
  await app.register(helmet);
  await app.register(multipart); // Files module (Phase 3 Part C) needs multipart/form-data support

  registerRoutes(app, container, config);

  app.setErrorHandler(createErrorHandler(logger));

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: `Route not found: ${request.method} ${request.url}` } });
  });

  try {
    await app.listen({ port: config.PORT, host: config.HOST });
    logger.info({ port: config.PORT, host: config.HOST }, 'ICE backend listening');
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down gracefully');
    await app.close();
    await container.prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('Fatal error during startup:', error);
  process.exit(1);
});
