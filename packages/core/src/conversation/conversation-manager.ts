import type { NeutralPromptMessage } from '@ice/types';
import type { AiRouter } from '../router/ai-router.js';

export interface CompressionResult {
  recentMessages: NeutralPromptMessage[];
  summary?: string;
}

/**
 * ConversationManager — Document 1's "Conversation Manager" requirement:
 * context window management and automatic history compression. Creation
 * and resume of a conversation THREAD are backend/persistence concerns
 * (Chat module, Phase 3 Part B, since ICE Core doesn't own message
 * history storage — only Memory) — this class owns the one piece of
 * real logic that genuinely belongs in Core: deciding how much raw
 * history fits in a model's context window, and compressing the rest
 * into a summary when it doesn't.
 */
export class ConversationManager {
  constructor(
    private readonly router: AiRouter,
    private readonly options: { maxRecentMessages: number; approxCharBudget: number } = {
      maxRecentMessages: 20,
      approxCharBudget: 24_000, // ~6k tokens at a ~4 chars/token heuristic — deliberately approximate
    },
  ) {}

  /**
   * Returns the most recent messages verbatim, plus a summary of
   * whatever was dropped — but only calls the Router (an actual model
   * call) if there's genuinely more history than fits. A short
   * conversation costs nothing extra; only a long one pays for
   * summarization, and only once it needs to.
   */
  async manageContextWindow(history: NeutralPromptMessage[]): Promise<CompressionResult> {
    const withinCountBudget = history.length <= this.options.maxRecentMessages;
    const totalChars = history.reduce((sum, m) => sum + m.content.length, 0);
    const withinCharBudget = totalChars <= this.options.approxCharBudget;

    if (withinCountBudget && withinCharBudget) {
      return { recentMessages: history };
    }

    const splitIndex = Math.max(0, history.length - this.options.maxRecentMessages);
    const older = history.slice(0, splitIndex);
    const recent = history.slice(splitIndex);

    if (older.length === 0) {
      // Character budget alone was exceeded on a small number of very
      // long messages — nothing meaningful to compress; let it through
      // as-is rather than summarizing a single oversized message.
      return { recentMessages: recent };
    }

    const summary = await this.summarize(older);
    return { recentMessages: recent, summary };
  }

  private async summarize(messages: NeutralPromptMessage[]): Promise<string> {
    const transcript = messages.map((m) => `${m.role}: ${m.content}`).join('\n');

    const result = await this.router.route({
      taskType: 'summarization',
      messages: [
        {
          role: 'system',
          content:
            'Summarize the following conversation transcript in 3-5 sentences, ' +
            'preserving any concrete facts, decisions, or commitments made. ' +
            'Write the summary only, no preamble.',
        },
        { role: 'user', content: transcript },
      ],
    });

    return result.content;
  }
}
