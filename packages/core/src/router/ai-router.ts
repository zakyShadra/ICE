import type { ProviderHealth, RouterRequest, RouterResponse } from '@ice/types';
import type { IceEventBus } from '../shared/events.js';
import { NoProviderAvailableError } from '../shared/errors.js';
import type { IProviderAdapter, RoutingStrategy } from './router.types.js';
import type { ProviderRegistry } from './provider-registry.js';

export interface RetryOptions {
  maxAttempts: number;
  perAttemptTimeoutMs: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = { maxAttempts: 3, perAttemptTimeoutMs: 20_000 };

/**
 * AiRouter — Document 2, Section 3.1's "AI Router" module. Phase 4
 * adds real retry-with-provider-fallback: if the strategy's chosen
 * adapter fails or times out, the Router excludes it and re-runs
 * selection against the remaining available adapters, up to
 * `maxAttempts` times, logging every failure (non-blocking, via
 * Observer) along the way. Only throws once every available adapter
 * has been tried and failed — a graceful, informative failure
 * (`NoProviderAvailableError` if the registry is fully exhausted,
 * or the last real error otherwise) rather than surfacing the first
 * transient failure to the user.
 */
export class AiRouter {
  constructor(
    private readonly registry: ProviderRegistry,
    private readonly strategy: RoutingStrategy,
    private readonly events: IceEventBus,
    private readonly retryOptions: RetryOptions = DEFAULT_RETRY_OPTIONS,
  ) {}

  listProviders(): Array<{ id: string; available: boolean }> {
    return this.registry.list().map((adapter) => ({ id: adapter.id, available: adapter.isAvailable() }));
  }

  async healthCheckAll(): Promise<ProviderHealth[]> {
    return this.registry.healthCheckAll();
  }

  /**
   * On-demand health check for exactly one provider — Phase 4.5's
   * `POST /v1/providers/test`. Returns undefined if the id isn't
   * registered at all (the route maps that to 404); returns the real
   * ProviderHealth result (which may itself report `unavailable` or
   * `auth_failed`) if it is.
   */
  async testProvider(id: string): Promise<ProviderHealth | undefined> {
    const adapter = this.registry.list().find((a) => a.id === id);
    return adapter?.healthCheck();
  }

  async route(request: RouterRequest): Promise<RouterResponse> {
    return this.executeWithFallback(request, (adapter, req) => this.withTimeout(adapter.complete(req)));
  }

  /** Streaming variant — same selection/retry/fallback logic, forwarding chunks as they arrive. */
  async routeStream(request: RouterRequest, onChunk: (text: string) => void): Promise<RouterResponse> {
    return this.executeWithFallback(request, (adapter, req) =>
      this.withTimeout(adapter.streamComplete(req, { onChunk })),
    );
  }

  private async executeWithFallback(
    request: RouterRequest,
    call: (adapter: IProviderAdapter, request: RouterRequest) => Promise<{ content: string; tokensIn?: number; tokensOut?: number }>,
  ): Promise<RouterResponse> {
    const excluded = new Set<string>();
    let lastError: unknown;

    const attempts = Math.min(this.retryOptions.maxAttempts, Math.max(1, this.registry.list().length));

    for (let attempt = 0; attempt < attempts; attempt++) {
      const candidates = this.registry.list().filter((adapter) => !excluded.has(adapter.id));
      if (candidates.length === 0) break;

      let selection: { adapter: IProviderAdapter; reason: string };
      try {
        selection = this.strategy.selectProvider(request, candidates);
      } catch (error) {
        // Strategy itself found nothing available among the remaining
        // candidates — no point looping further.
        lastError = error;
        break;
      }

      const { adapter, reason } = selection;
      const startedAt = Date.now();

      try {
        const result = await call(adapter, request);
        const latencyMs = Date.now() - startedAt;

        this.events.emit('router.provider.selected', { provider: adapter.id, taskType: request.taskType, reason });

        return {
          content: result.content,
          metadata: {
            providerUsed: adapter.id,
            selectionReason: attempt === 0 ? reason : `${reason}:fallback_after_${attempt}_failure(s)`,
            latencyMs,
            tokensIn: result.tokensIn,
            tokensOut: result.tokensOut,
          },
        };
      } catch (error) {
        lastError = error;
        excluded.add(adapter.id);
        const willRetry = attempt < attempts - 1 && candidates.length > 1;

        this.events.emit('router.provider.failed', {
          provider: adapter.id,
          taskType: request.taskType,
          error: error instanceof Error ? error.message : String(error),
          willRetry,
        });
      }
    }

    if (lastError instanceof Error) throw lastError;
    throw new NoProviderAvailableError();
  }

  /**
   * Races the provider call against a timeout. Honest limitation: this
   * stops the Router from *waiting* past `perAttemptTimeoutMs`, but it
   * does not abort the underlying fetch — the provider adapter's
   * request may still complete in the background after the Router has
   * already moved on to a fallback. True cancellation would require
   * threading an AbortSignal through every adapter's fetch call, which
   * is a real, specific future improvement, not something to silently
   * claim this already does.
   */
  private withTimeout<T>(promise: Promise<T>): Promise<T> {
    const timeoutMs = this.retryOptions.perAttemptTimeoutMs;
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Provider call timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }
}
