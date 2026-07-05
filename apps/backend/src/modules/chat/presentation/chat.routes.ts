import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { ChatService } from '../application/chat.service.js';
import { SessionNotFoundError } from '../domain/chat.types.js';

const createSessionSchema = z.object({ title: z.string().min(1).max(120).optional() });
const renameSessionSchema = z.object({ title: z.string().min(1).max(120) });
const sendMessageSchema = z.object({
  input: z.string().min(1).max(8000),
  preferredProvider: z
    .enum(['anthropic', 'openai', 'google', 'deepseek', 'qwen', 'ollama', 'openrouter'])
    .optional(),
});

/**
 * Chat routes — Document 2, Section 7.2's thin-controller rule. This
 * one file replaces the old top-level routes/chat.route.ts (Phase 1's
 * single-shot /v1/chat) now that chat sessions are real, persisted
 * entities per this session's Phase 3 scope — the single-turn endpoint
 * from Phase 1 is superseded by POST /v1/chats/:id/messages below,
 * which does everything the old one did (calls Brain) plus persists
 * both sides of the exchange as real history.
 */
export function registerChatRoutes(app: FastifyInstance, chatService: ChatService): void {
  app.post('/chats', async (request, reply) => {
    const parsed = createSessionSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }
    const session = await chatService.createSession(request.user!.id, parsed.data.title);
    return reply.code(201).send({ session });
  });

  app.get('/chats', async (request, reply) => {
    const sessions = await chatService.listSessions(request.user!.id);
    return reply.send({ sessions });
  });

  app.patch<{ Params: { id: string } }>('/chats/:id', async (request, reply) => {
    const parsed = renameSessionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }
    try {
      const session = await chatService.renameSession(request.params.id, request.user!.id, parsed.data.title);
      return reply.send({ session });
    } catch (error) {
      return handleChatError(error, reply);
    }
  });

  app.delete<{ Params: { id: string } }>('/chats/:id', async (request, reply) => {
    try {
      await chatService.deleteSession(request.params.id, request.user!.id);
      return reply.code(204).send();
    } catch (error) {
      return handleChatError(error, reply);
    }
  });

  app.get<{ Params: { id: string } }>('/chats/:id/messages', async (request, reply) => {
    try {
      const messages = await chatService.getHistory(request.params.id, request.user!.id);
      return reply.send({ messages });
    } catch (error) {
      return handleChatError(error, reply);
    }
  });

  app.post<{ Params: { id: string } }>('/chats/:id/messages', async (request, reply) => {
    const parsed = sendMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    try {
      const result = await chatService.sendMessage({
        userId: request.user!.id,
        sessionId: request.params.id,
        input: parsed.data.input,
        preferredProvider: parsed.data.preferredProvider,
      });
      return reply.send(result);
    } catch (error) {
      return handleChatError(error, reply);
    }
  });

  /**
   * SSE streaming endpoint — Phase 4's Streaming Engine, client-facing
   * surface. Emits `start` / `chunk` / `complete` / `error` events
   * (Document 1's exact event vocabulary) as `text/event-stream`. The
   * Flutter app can consume this later without the backend's
   * architecture changing — Brain/Router/ChatService are identical
   * whether a request came through this route or the JSON one above.
   */
  app.post<{ Params: { id: string } }>('/chats/:id/messages/stream', async (request, reply) => {
    const parsed = sendMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    }

    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    });

    const writeEvent = (event: Record<string, unknown>): void => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    writeEvent({ type: 'start' });

    try {
      const result = await chatService.sendMessageStream({
        userId: request.user!.id,
        sessionId: request.params.id,
        input: parsed.data.input,
        preferredProvider: parsed.data.preferredProvider,
        onChunk: (text) => writeEvent({ type: 'chunk', content: text }),
      });

      writeEvent({
        type: 'complete',
        fullContent: result.assistantMessage.content,
        metadata: result.router,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong.';
      writeEvent({ type: 'error', error: { code: 'STREAM_FAILED', message } });
    } finally {
      reply.raw.end();
    }
  });
}

function handleChatError(error: unknown, reply: import('fastify').FastifyReply) {
  if (error instanceof SessionNotFoundError) {
    return reply.code(404).send({ error: { code: error.code, message: error.message } });
  }
  throw error;
}
