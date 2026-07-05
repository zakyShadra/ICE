import type { ModelMetadata, ProviderHealth, ProviderId } from '@ice/types';
import type { IProviderAdapter } from './router.types.js';

/**
 * ProviderRegistry — Phase 4: the single place adapters are registered
 * and discovered from. AiRouter no longer holds a raw adapter array;
 * it holds a ProviderRegistry, which is what makes "add a provider
 * without modifying existing business logic" (this phase's explicit
 * requirement) literally true — registering a new adapter is one call
 * here, at the composition root, and nothing in AiRouter, Brain, or any
 * RoutingStrategy needs to change.
 */
export class ProviderRegistry {
  private readonly adapters = new Map<ProviderId, IProviderAdapter>();
  private defaultProviderId: ProviderId | undefined;

  register(adapter: IProviderAdapter, options?: { asDefault?: boolean }): void {
    this.adapters.set(adapter.id, adapter);
    if (options?.asDefault || !this.defaultProviderId) {
      this.defaultProviderId = adapter.id;
    }
  }

  get(id: ProviderId): IProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  list(): IProviderAdapter[] {
    return [...this.adapters.values()];
  }

  listAvailable(): IProviderAdapter[] {
    return this.list().filter((adapter) => adapter.isAvailable());
  }

  setDefault(id: ProviderId): void {
    if (!this.adapters.has(id)) {
      throw new Error(`Cannot set default provider to unregistered id: ${id}`);
    }
    this.defaultProviderId = id;
  }

  /** Falls back to the first available adapter if the configured default isn't currently usable. */
  getDefault(): IProviderAdapter | undefined {
    const configured = this.defaultProviderId ? this.adapters.get(this.defaultProviderId) : undefined;
    if (configured?.isAvailable()) return configured;
    return this.listAvailable()[0];
  }

  capabilities(id: ProviderId): ModelMetadata[] {
    return this.adapters.get(id)?.listModels() ?? [];
  }

  async healthCheckAll(): Promise<ProviderHealth[]> {
    return Promise.all(this.list().map((adapter) => adapter.healthCheck()));
  }
}
