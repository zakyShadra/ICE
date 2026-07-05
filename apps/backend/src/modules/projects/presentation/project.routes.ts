import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ProjectNotFoundError } from '../domain/project.types.js';
import type { ProjectService } from '../application/project.service.js';

const createProjectSchema = z.object({ name: z.string().min(1).max(120) });
const updateProjectSchema = z.object({ name: z.string().min(1).max(120) });

export function registerProjectRoutes(app: FastifyInstance, projectService: ProjectService): void {
  app.post('/projects', async (request, reply) => {
    const parsed = createProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }
    const project = await projectService.create({ userId: request.user!.id, name: parsed.data.name });
    return reply.code(201).send({ project });
  });

  app.get('/projects', async (request, reply) => {
    const projects = await projectService.list(request.user!.id);
    return reply.send({ projects });
  });

  app.get<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    try {
      const project = await projectService.getById(request.params.id, request.user!.id);
      return reply.send({ project });
    } catch (error) {
      return handleProjectError(error, reply);
    }
  });

  app.patch<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    const parsed = updateProjectSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }
    try {
      const project = await projectService.update(request.params.id, request.user!.id, parsed.data.name);
      return reply.send({ project });
    } catch (error) {
      return handleProjectError(error, reply);
    }
  });

  app.delete<{ Params: { id: string } }>('/projects/:id', async (request, reply) => {
    try {
      await projectService.delete(request.params.id, request.user!.id);
      return reply.code(204).send();
    } catch (error) {
      return handleProjectError(error, reply);
    }
  });
}

function handleProjectError(error: unknown, reply: import('fastify').FastifyReply) {
  if (error instanceof ProjectNotFoundError) {
    return reply.code(404).send({ error: { code: error.code, message: error.message } });
  }
  throw error;
}
