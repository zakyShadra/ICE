import type { FastifyInstance } from 'fastify';
import type { Container } from '../di/container.js';
import { registerHealthRoute } from './health.route.js';
import { createAuthMiddleware } from '../middleware/auth.middleware.js';
import type { IceConfig } from '@ice/config';
import { registerAuthRoutes, registerAuthenticatedAuthRoutes } from '../modules/auth/presentation/auth.routes.js';
import { registerProfileRoutes } from '../modules/profile/presentation/profile.routes.js';
import { registerChatRoutes } from '../modules/chat/presentation/chat.routes.js';
import { registerProjectRoutes } from '../modules/projects/presentation/project.routes.js';
import { registerFileRoutes } from '../modules/files/presentation/file.routes.js';
import { registerSettingsRoutes } from '../modules/settings/presentation/settings.routes.js';
import { registerMemoryRoutes } from '../modules/memory/presentation/memory.routes.js';
import { registerProviderRoutes } from '../modules/providers/presentation/provider.routes.js';
import { registerModelRoutes } from '../modules/providers/presentation/model.routes.js';

/**
 * Route registration — Document 2, Section 7.1. All versioned routes
 * live under /v1. Public auth routes (register/login/refresh) are
 * registered WITHOUT the auth middleware since they're how a session
 * is established in the first place; everything else in the /v1 group
 * requires a valid bearer token.
 */
export function registerRoutes(app: FastifyInstance, container: Container, config: IceConfig): void {
  registerHealthRoute(app, container);

  const authenticate = createAuthMiddleware(config);

  app.register(
    async (v1) => {
      // Public — no auth middleware.
      registerAuthRoutes(v1, container.authService);

      // Authenticated — everything registered after this hook requires
      // a valid bearer token.
      v1.addHook('preHandler', authenticate);
      registerAuthenticatedAuthRoutes(v1, container.authService);
      registerProfileRoutes(v1, container.profileService);
      registerChatRoutes(v1, container.chatService);
      registerProjectRoutes(v1, container.projectService);
      registerFileRoutes(v1, container.fileService);
      registerSettingsRoutes(v1, container.settingsService);
      registerMemoryRoutes(v1, container.memory);
      registerProviderRoutes(v1, container.router);
      registerModelRoutes(v1, container.modelRegistry);
    },
    { prefix: '/v1' },
  );
}
