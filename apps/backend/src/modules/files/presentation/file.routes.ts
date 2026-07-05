import type { FastifyInstance } from 'fastify';
import { FileNotFoundError } from '../domain/file.types.js';
import type { FileService } from '../application/file.service.js';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB — a deliberate, explicit V1 ceiling

/**
 * File routes — requires @fastify/multipart to be registered on the
 * app (wired in server.ts) since uploads are multipart/form-data, not
 * JSON. Every other route in this backend is JSON; this module is the
 * one exception, scoped narrowly to where it's actually needed.
 */
export function registerFileRoutes(app: FastifyInstance, fileService: FileService): void {
  app.post('/files', async (request, reply) => {
    const data = await request.file({ limits: { fileSize: MAX_FILE_SIZE_BYTES } });

    if (!data) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'No file provided.' } });
    }

    const buffer = await data.toBuffer();
    const projectId = (data.fields.projectId as { value?: string } | undefined)?.value;

    const asset = await fileService.upload({
      userId: request.user!.id,
      projectId,
      fileName: data.filename,
      mimeType: data.mimetype,
      buffer,
    });

    return reply.code(201).send({ file: asset });
  });

  app.get<{ Params: { id: string } }>('/files/:id', async (request, reply) => {
    try {
      const asset = await fileService.getMetadata(request.params.id, request.user!.id);
      return reply.send({ file: asset });
    } catch (error) {
      return handleFileError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>('/files/:id/download', async (request, reply) => {
    try {
      const { asset, buffer } = await fileService.download(request.params.id, request.user!.id);
      reply.header('content-type', asset.mimeType);
      reply.header('content-disposition', `attachment; filename="${asset.fileName}"`);
      return reply.send(buffer);
    } catch (error) {
      return handleFileError(error, reply);
    }
  });

  app.delete<{ Params: { id: string } }>('/files/:id', async (request, reply) => {
    try {
      await fileService.delete(request.params.id, request.user!.id);
      return reply.code(204).send();
    } catch (error) {
      return handleFileError(error, reply);
    }
  });
}

function handleFileError(error: unknown, reply: import('fastify').FastifyReply) {
  if (error instanceof FileNotFoundError) {
    return reply.code(404).send({ error: { code: error.code, message: error.message } });
  }
  throw error;
}
