import type { ModelMetadata, ProviderId } from '@ice/types';

/**
 * ModelRegistry — Phase 4: static metadata for every known model,
 * queried by AiRouter/RoutingStrategy instead of hardcoding model
 * knowledge inline. Adding a new model is a data addition here, not a
 * code change anywhere else — that's the entire point of this class.
 *
 * Deliberately a plain in-memory table, not a database-backed registry:
 * model capabilities (context window, streaming support, etc.) are a
 * property of the provider's API, not user data — they change when
 * providers ship new models, which is a deploy, not a runtime event.
 */
export class ModelRegistry {
  private readonly models: ModelMetadata[] = [
    {
      provider: 'anthropic',
      modelName: 'claude-sonnet-5',
      contextWindow: 200_000,
      supportsStreaming: true,
      supportsVision: true,
      supportsToolCalling: true,
      supportsEmbeddings: false,
    },
    {
      provider: 'openai',
      modelName: 'gpt-4.1',
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsVision: true,
      supportsToolCalling: true,
      supportsEmbeddings: false,
    },
    {
      provider: 'openai',
      modelName: 'text-embedding-3-large',
      contextWindow: 8_191,
      supportsStreaming: false,
      supportsVision: false,
      supportsToolCalling: false,
      supportsEmbeddings: true,
    },
    {
      provider: 'google',
      modelName: 'gemini-2.0-pro',
      contextWindow: 1_000_000,
      supportsStreaming: true,
      supportsVision: true,
      supportsToolCalling: true,
      supportsEmbeddings: false,
    },
    {
      provider: 'openrouter',
      modelName: 'openrouter/auto',
      contextWindow: 128_000,
      supportsStreaming: true,
      supportsVision: false,
      supportsToolCalling: true,
      supportsEmbeddings: false,
    },
    {
      provider: 'ollama',
      modelName: 'llama3',
      contextWindow: 8_192,
      supportsStreaming: true,
      supportsVision: false,
      supportsToolCalling: false,
      supportsEmbeddings: false,
    },
  ];

  list(): ModelMetadata[] {
    return [...this.models];
  }

  listByProvider(provider: ProviderId): ModelMetadata[] {
    return this.models.filter((m) => m.provider === provider);
  }

  find(provider: ProviderId, modelName: string): ModelMetadata | undefined {
    return this.models.find((m) => m.provider === provider && m.modelName === modelName);
  }

  /** Registers or replaces a model's metadata — the "add a model without touching code elsewhere" path. */
  register(model: ModelMetadata): void {
    const index = this.models.findIndex(
      (m) => m.provider === model.provider && m.modelName === model.modelName,
    );
    if (index >= 0) {
      this.models[index] = model;
    } else {
      this.models.push(model);
    }
  }

  supportsCapability(provider: ProviderId, capability: keyof ModelMetadata): ModelMetadata[] {
    return this.listByProvider(provider).filter((m) => m[capability] === true);
  }
}
