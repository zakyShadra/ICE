import type {
  ModelMetadata,
  ProviderHealth,
  ProviderId,
  RouterRequest,
  RouterResponse,
} from '@ice/types';

export interface CompletionResult {
  content: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface StreamChunkHandler {
  onChunk(text: string): void;
}

/**
 * IProviderAdapter — the ONLY interface any Core module outside this
 * directory may depend on for calling an AI provider.
 *
 * Per Document 2, Section 4, Rule 1: only Router (specifically, this
 * directory) may import a provider SDK. Every provider implements this
 * exact same shape, which is what makes providers genuinely
 * interchangeable rather than interchangeable in name only.
 *
 * Phase 4 extension: adds streaming, model listing, health check, and
 * optional embeddings — all additive to the Phase 1 interface. Every
 * adapter built before this phase (`complete()`, `isAvailable()`)
 * keeps working unchanged; nothing here breaks that contract.
 */
export interface IProviderAdapter {
  readonly id: ProviderId;

  isAvailable(): boolean;

  complete(request: RouterRequest): Promise<CompletionResult>;

  /**
   * Streams a completion, invoking `handler.onChunk` as text arrives and
   * resolving with the same shape `complete()` returns once done. Every
   * adapter implements this for real (even if the underlying provider
   * API doesn't support streaming, in which case it degrades to one
   * "chunk" containing the full response) — the caller should never
   * need to know which case it is.
   */
  streamComplete(request: RouterRequest, handler: StreamChunkHandler): Promise<CompletionResult>;

  /** Static or cheaply-fetched model list — never requires a live call for known models. */
  listModels(): ModelMetadata[];

  /**
   * Config-presence + (where cheap) a lightweight reachability check.
   * Never throws — always returns a health record, since "provider is
   * down" is a normal, expected state to report, not an exceptional one.
   */
  healthCheck(): Promise<ProviderHealth>;

  /** Optional — only providers with an embeddings endpoint implement this meaningfully. */
  embed?(text: string): Promise<number[]>;
}

export interface RoutingStrategy {
  selectProvider(request: RouterRequest, availableAdapters: IProviderAdapter[]): {
    adapter: IProviderAdapter;
    reason: string;
  };
}
