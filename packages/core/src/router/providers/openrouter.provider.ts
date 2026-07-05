import type { ModelMetadata, ProviderHealth, RouterRequest } from '@ice/types';
import { ProviderUnavailableError } from '../../shared/errors.js';
import type { CompletionResult, IProviderAdapter, StreamChunkHandler } from '../router.types.js';
import type { ModelRegistry } from '../model-registry.js';
import { classifyHealthResponse } from '../health-check.util.js';

/**
 * Real OpenRouter provider adapter. OpenRouter's API is OpenAI-
 * compatible by design, so this adapter's shape closely mirrors
 * OpenAiProviderAdapter — but it's kept as its own file rather than
 * sharing code, because "OpenRouter is currently OpenAI-shaped" is an
 * implementation detail of OpenRouter's API today, not a structural
 * guarantee this codebase should couple two providers on.
 */
export class OpenRouterProviderAdapter implements IProviderAdapter {
  readonly id = 'openrouter' as const;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly modelRegistry: ModelRegistry,
    private readonly model = 'openrouter/auto',
  ) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: RouterRequest): Promise<CompletionResult> {
    if (!this.apiKey) throw new ProviderUnavailableError(this.id, 'OPENROUTER_API_KEY is not configured');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
    if (!this.apiKey) throw new ProviderUnavailableError(this.id, 'OPENROUTER_API_KEY is not configured');

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ model: this.model, stream: true, messages: request.messages }),
    });

    if (!response.ok || !response.body) {
      throw new ProviderUnavailableError(this.id, `HTTP ${response.status}: ${await response.text()}`);
    }

    let fullContent = '';
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

        const event = JSON.parse(payload) as { choices: Array<{ delta?: { content?: string } }> };
        const delta = event.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          handler.onChunk(delta);
        }
      }
    }

    return { content: fullContent };
  }

  listModels(): ModelMetadata[] {
    return this.modelRegistry.listByProvider(this.id);
  }

  async healthCheck(): Promise<ProviderHealth> {
    if (!this.apiKey) {
      return classifyHealthResponse({ providerId: this.id, configured: false });
    }
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: this.headers(),
        signal: AbortSignal.timeout(4000),
      });
      return classifyHealthResponse({ providerId: this.id, configured: true, response });
    } catch (error) {
      return classifyHealthResponse({ providerId: this.id, configured: true, error });
    }
  }

  private headers(): Record<string, string> {
    return {
      'content-type': 'application/json',
      authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://ice.app',
      'X-Title': 'ICE',
    };
  }
}
