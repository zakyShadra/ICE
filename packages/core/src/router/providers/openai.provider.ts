import type { ModelMetadata, ProviderHealth, RouterRequest } from '@ice/types';
import { ProviderUnavailableError } from '../../shared/errors.js';
import type { CompletionResult, IProviderAdapter, StreamChunkHandler } from '../router.types.js';
import type { ModelRegistry } from '../model-registry.js';
import { classifyHealthResponse } from '../health-check.util.js';

/**
 * Real OpenAI provider adapter (Chat Completions API over fetch).
 * Phase 4 addition — proves the Router's provider-agnostic contract
 * against a third distinct API shape (SSE with `data: [DONE]` sentinel,
 * unlike Anthropic's typed event stream).
 */
export class OpenAiProviderAdapter implements IProviderAdapter {
  readonly id = 'openai' as const;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly modelRegistry: ModelRegistry,
    private readonly model = 'gpt-4.1',
  ) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: RouterRequest): Promise<CompletionResult> {
    if (!this.apiKey) throw new ProviderUnavailableError(this.id, 'OPENAI_API_KEY is not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, stream: false, messages: request.messages }),
    });

    if (!response.ok) {
      throw new ProviderUnavailableError(this.id, `HTTP ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0]?.message.content ?? '',
      tokensIn: data.usage?.prompt_tokens,
      tokensOut: data.usage?.completion_tokens,
    };
  }

  async streamComplete(request: RouterRequest, handler: StreamChunkHandler): Promise<CompletionResult> {
    if (!this.apiKey) throw new ProviderUnavailableError(this.id, 'OPENAI_API_KEY is not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        model: this.model,
        stream: true,
        stream_options: { include_usage: true },
        messages: request.messages,
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
        if (!line.startsWith('data:')) continue;
        const payload = line.slice('data:'.length).trim();
        if (!payload || payload === '[DONE]') continue;

        const event = JSON.parse(payload) as {
          choices: Array<{ delta?: { content?: string } }>;
          usage?: { prompt_tokens?: number; completion_tokens?: number };
        };

        const delta = event.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          handler.onChunk(delta);
        }
        if (event.usage) {
          tokensIn = event.usage.prompt_tokens;
          tokensOut = event.usage.completion_tokens;
        }
      }
    }

    return { content: fullContent, tokensIn, tokensOut };
  }

  listModels(): ModelMetadata[] {
    return this.modelRegistry.listByProvider(this.id);
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return classifyHealthResponse({ providerId: this.id, configured: false });
    }
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: this.headers(),
        signal: AbortSignal.timeout(4000),
      });
      return classifyHealthResponse({ providerId: this.id, configured: true, response });
    } catch (error) {
      return classifyHealthResponse({ providerId: this.id, configured: true, error });
    }
  }

  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) throw new ProviderUnavailableError(this.id, 'OPENAI_API_KEY is not configured');

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: 'text-embedding-3-large', input: text }),
    });

    if (!response.ok) {
      throw new ProviderUnavailableError(this.id, `HTTP ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return data.data[0]?.embedding ?? [];
  }

  private headers(): Record<string, string> {
    return { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` };
  }
}
