import type { ModelMetadata, ProviderHealth, RouterRequest } from '@ice/types';
import { ProviderUnavailableError } from '../../shared/errors.js';
import type { CompletionResult, IProviderAdapter, StreamChunkHandler } from '../router.types.js';
import type { ModelRegistry } from '../model-registry.js';
import { classifyHealthResponse } from '../health-check.util.js';

/**
 * Real local-model provider adapter (Ollama). Phase 4 adds streaming
 * (Ollama's `/api/chat` natively supports NDJSON streaming) and a real
 * health check that pings `/api/tags` — this is the one adapter where a
 * live reachability check is cheap and appropriate (localhost, no
 * quota/cost concerns), unlike the cloud providers.
 */
export class OllamaProviderAdapter implements IProviderAdapter {
  readonly id = 'ollama' as const;

  constructor(
    private readonly baseUrl: string | undefined,
    private readonly modelRegistry: ModelRegistry,
    private readonly model = 'llama3',
  ) {}

  isAvailable(): boolean {
    return Boolean(this.baseUrl);
  }

  async complete(request: RouterRequest): Promise<CompletionResult> {
    if (!this.baseUrl) {
      throw new ProviderUnavailableError(this.id, 'OLLAMA_BASE_URL is not configured');
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      throw new ProviderUnavailableError(this.id, `HTTP ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      message: { content: string };
      prompt_eval_count?: number;
      eval_count?: number;
    };

    return { content: data.message.content, tokensIn: data.prompt_eval_count, tokensOut: data.eval_count };
  }

  async streamComplete(request: RouterRequest, handler: StreamChunkHandler): Promise<CompletionResult> {
    if (!this.baseUrl) {
      throw new ProviderUnavailableError(this.id, 'OLLAMA_BASE_URL is not configured');
    }

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        stream: true,
        messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok || !response.body) {
      throw new ProviderUnavailableError(this.id, `HTTP ${response.status}: ${await response.text()}`);
    }

    let fullContent = '';
    let tokensIn: number | undefined;
    let tokensOut: number | undefined;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
          prompt_eval_count?: number;
          eval_count?: number;
        };

        if (chunk.message?.content) {
          fullContent += chunk.message.content;
          handler.onChunk(chunk.message.content);
        }
        if (chunk.done) {
          tokensIn = chunk.prompt_eval_count;
          tokensOut = chunk.eval_count;
        }
      }
    }

    return { content: fullContent, tokensIn, tokensOut };
  }

  listModels(): ModelMetadata[] {
    return this.modelRegistry.listByProvider(this.id);
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.baseUrl) {
      return classifyHealthResponse({ providerId: this.id, configured: false });
    }
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return classifyHealthResponse({ providerId: this.id, configured: true, response });
    } catch (error) {
      return classifyHealthResponse({ providerId: this.id, configured: true, error });
    }
  }
}
