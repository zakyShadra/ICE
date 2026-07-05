import pino from 'pino';
import type { IceConfig } from '@ice/config';
import type { ObserverSink } from '@ice/core';

/**
 * Structured (pino) logger — Document 2, Section 7.2. Every log line
 * includes a request ID where available so a single request's full
 * trace (auth -> controller -> Core -> Router -> response) can be
 * reconstructed from logs alone.
 */
export function createLogger(config: IceConfig) {
  return pino({
    level: config.LOG_LEVEL,
    transport:
      config.NODE_ENV === 'development'
        ? { target: 'pino-pretty', options: { colorize: true, translateTime: true } }
        : undefined,
  });
}

/**
 * Adapts pino to Core's ObserverSink interface (Document 2, Section
 * 3.1) — Observer knows nothing about pino; this is the one place that
 * bridges them, per Document 2, Section 7's dependency direction rule.
 */
export class PinoObserverSink implements ObserverSink {
  constructor(private readonly logger: pino.Logger) {}

  log(entry: Record<string, unknown>): void {
    this.logger.info(entry);
  }
}
