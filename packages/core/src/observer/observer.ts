import type { IceEventBus } from '../shared/events.js';

export interface ObserverSink {
  log(entry: Record<string, unknown>): void;
}

/**
 * Observer — Document 2, Section 3.1: cross-cutting telemetry. Read-only
 * and non-blocking by construction (Document 2, Section 4, Rule 5) —
 * it subscribes to the event bus and never sits on the critical path of
 * a request. The `ObserverSink` is injected so the backend can wire in
 * structured logging (pino) without Observer knowing anything about
 * Fastify or any specific logging library.
 */
export class Observer {
  constructor(events: IceEventBus, private readonly sink: ObserverSink) {
    events.on('turn.completed', (payload) => this.sink.log({ event: 'turn.completed', ...payload }));
    events.on('router.provider.selected', (payload) =>
      this.sink.log({ event: 'router.provider.selected', ...payload }),
    );
    events.on('router.provider.failed', (payload) =>
      this.sink.log({ event: 'router.provider.failed', ...payload }),
    );
    events.on('agent.step.executed', (payload) =>
      this.sink.log({ event: 'agent.step.executed', ...payload }),
    );
  }
}
