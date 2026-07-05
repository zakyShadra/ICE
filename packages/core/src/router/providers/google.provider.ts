import type { ModelMetadata, ProviderHealth, RouterRequest } from '@ice/types';
import { ProviderUnavailableError } from '../../shared/errors.js';
import type { CompletionResult, IProviderAdapter, StreamChunkHandler } from '../router.types.js';
import type { ModelRegistry } from '../model-registry.js';
import { classifyHealthResponse } from '../health-check.util.js';

/**
 * Real Google Gemini provider adapter (generateContent /
 * streamGenerateContent REST API). Gemini's message shape ("contents"
 * with "parts", roles "user"/"model", no native "system" role) is
 * meaningfully different from Anthropic/OpenAI's — exactly the kind of
 * difference this adapter layer exists to absorb so nothing above the
 * Router ever needs to know about it.
 */
export class GoogleProviderAdapter implements IProviderAdapter {
  readonly id = 'google' as const;

  constructor(
    private readonly apiKey: string | undefined,
    private readonly modelRegistry: ModelRegistry,
    private readonly model = 'gemini-2.0-pro',
  ) {}

  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  async complete(request: RouterRequest): Promise<CompletionResult> {
    if (!this.apiKey) throw new ProviderUnavailableError(this.id, 'GEMINI_API_KEY is not configured');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(this.buildBody(request)),
      },
    );

    if (!response.ok) {
      throw new ProviderUnavailableError(this.id, `HTTP ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      candidates: Array<{ content: { parts: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const content = (data.candidates[0]?.content.parts ?? []).map((p) => p.text ?? '').join('');

    return {
      content,
      tokensIn: data.usageMetadata?.promptTokenCount,
      tokensOut: data.usageMetadata?.candidatesTokenCount,
    };
  }

  async streamComplete(request: RouterRequest, handler: StreamChunkHandler): Promise<CompletionResult> {
    if (!this.apiKey) throw new ProviderUnavailableError(this.id, 'GEMINI_API_KEY is not configured');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(this.buildBody(request)),
      },
    );

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
          candidates?: Array<{ content: { parts: Array<{ text?: string }> } }>;
          usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
        };

        const text = (event.candidates?.[0]?.content.parts ?? []).map((p) => p.text ?? '').join('');
        if (text) {
          fullContent += text;
          handler.onChunk(text);
        }
        if (event.usageMetadata) {
          tokensIn = event.usageMetadata.promptTokenCount;
          tokensOut = event.usageMetadata.candidatesTokenCount;
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`,
        { signal: AbortSignal.timeout(4000) },
      );
      return classifyHealthResponse({ providerId: this.id, configured: true, response });
    } catch (error) {
      return classifyHealthResponse({ providerId: this.id, configured: true, error });
    }
  }

  private buildBody(request: RouterRequest) {
    // Gemini has no "system" role — system messages are folded into a
    // leading user-turn instruction instead, the standard workaround
    // for this API shape.
    const systemMessages = request.messages.filter((m) => m.role === 'system');
    const conversationMessages = request.messages.filter((m) => m.role !== 'system');

    const contents = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    return {
      contents,
      systemInstruction: systemMessages.length
        ? { parts: [{ text: systemMessages.map((m) => m.content).join('\n\n') }] }
        : undefined,
    };
  }
}
