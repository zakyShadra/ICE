import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { IceError } from '@ice/core';
import type pino from 'pino';

/**
 * Centralized error handling — Document 2, Section 7.4. Core throws
 * typed domain errors; this is the ONLY place they're mapped to HTTP
 * status codes. Internal detail is always logged server-side (with
 * whatever request-id pino attaches) but never leaked to the client
 * beyond a clean, safe message.
 */
const statusByErrorCode: Record<string, number> = {
  MEMORY_NOT_FOUND: 404,
  PERMISSION_DENIED: 403,
  PROVIDER_UNAVAILABLE: 503,
  NO_PROVIDER_AVAILABLE: 503,
  TOOL_NOT_FOUND: 404,
  TOOL_EXECUTION_FAILED: 502,
};

export function createErrorHandler(logger: pino.Logger) {
  return function errorHandler(
    error: FastifyError | IceError,
    request: FastifyRequest,
    reply: FastifyReply,
  ): void {
    if (error instanceof IceError) {
      logger.error({ err: error, code: error.code, url: request.url }, 'Domain error');
      const status = statusByErrorCode[error.code] ?? 500;
      void reply.code(status).send({ error: { code: error.code, message: error.message } });
      return;
    }

    logger.error({ err: error, url: request.url }, 'Unhandled error');
    void reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our end.' },
    });
  };
}
