import { EventEmitter } from 'node:events';

/**
 * ICE's internal event bus — scoped narrowly to Observer/telemetry.
 *
 * Per Document 2, Section 6.4: "the event bus is for observation, not
 * for control flow." No Core module should ever change its behavior
 * based on an event received here — if behavior depends on it, that's
 * a direct call in disguise and should be written as one.
 */

export interface IceEventMap {
  'turn.completed': {
    userId: string;
    sessionId: string;
    providerUsed: string;
    latencyMs: number;
  };
  'router.provider.selected': {
    provider: string;
    taskType: string;
    reason: string;
  };
  'router.provider.failed': {
    provider: string;
    taskType: string;
    error: string;
    willRetry: boolean;
  };
  'agent.step.executed': {
    taskId: string;
    stepId: string;
    status: string;
  };
}

export type IceEventName = keyof IceEventMap;

export class IceEventBus {
  private readonly emitter = new EventEmitter();

  emit<K extends IceEventName>(event: K, payload: IceEventMap[K]): void {
    // Fire-and-forget, non-blocking by design (Document 2, Section 4, Rule 5).
    setImmediate(() => this.emitter.emit(event, payload));
  }

  on<K extends IceEventName>(event: K, handler: (payload: IceEventMap[K]) => void): void {
    this.emitter.on(event, handler);
  }
}
