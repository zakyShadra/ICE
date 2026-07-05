import type { ModelMetadata, ProviderHealth, RouterRequest } from '@ice/types';
import { ProviderUnavailableError } from '../../shared/errors.js';
import type { CompletionResult, IProviderAdapter, StreamChunkHandler } from '../router.types.js';
import type { ModelRegistry } from '../model-registry.js';
import { classifyHealthResponse } from '../health-check.util.js';

/**
 * Real Anthropic provider adapter — uses the plain Messages API over
 * fetch. Phase 4 adds real SSE streaming, health check, and model
 * listing (delegated to ModelRegistry, not hardcoded here) on top of
 * the Phase 1 `complete()` implementation, which is unchanged.
 */
export class AnthropicProviderAdapter implements IProviderAdapter {
  readonly id = 'anthropic' as const;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly modelRegistry: ModelRegistry,
    private readonly model = 'claude-sonnet-5',
  ) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: RouterRequest): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new ProviderUnavailableError(this.id, 'ANTHROPIC_API_KEY is not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, false)),
    });

    if (!response.ok) {
      throw new ProviderUnavailableError(this.id, `HTTP ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const content = data.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text)
      .join('\n');

    return { content, tokensIn: data.usage?.input_tokens, tokensOut: data.usage?.output_tokens };
  }

  async streamComplete(request: RouterRequest, handler: StreamChunkHandler): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new ProviderUnavailableError(this.id, 'ANTHROPIC_API_KEY is not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(this.buildBody(request, true)),
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
        if (!payload) continue;

        const event = JSON.parse(payload) as {
          type: string;
          delta?: { text?: string };
          usage?: { input_tokens?: number; output_tokens?: number };
          message?: { usage?: { input_tokens?: number } };
        };

        if (event.type === 'content_block_delta' && event.delta?.text) {
          fullContent += event.delta.text;
          handler.onChunk(event.delta.text);
        }
        if (event.type === 'message_start' && event.message?.usage?.input_tokens) {
          tokensIn = event.message.usage.input_tokens;
        }
        if (event.type === 'message_delta' && event.usage?.output_tokens) {
          tokensOut = event.usage.output_tokens;
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
      const response = await fetch('https://api.anthropic.com/v1/models', {
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
      'x-api-key': this.apiKey!,
      'anthropic-version': '2023-06-01',
    };
  }

  private buildBody(request: RouterRequest, stream: boolean) {
    const systemMessages = request.messages.filter((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    return {
      model: this.model,
      max_tokens: 1024,
      stream,
      system: systemMessages.map((m) => m.content).join('\n\n') || undefined,
      messages: conversationMessages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    };
  }
}
