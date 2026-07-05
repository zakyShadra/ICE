import type { NeutralPromptMessage } from '@ice/types';
import type { BuiltContext } from '../context/context-builder.js';

/**
 * PromptBuilder — Document 2, Section 3.1: converts assembled context +
 * intent into a provider-agnostic message array. Stays completely
 * unaware of which provider will eventually receive this — Router
 * adapters translate the neutral shape at the edge.
 *
 * Phase 4 extension: the system prompt now folds in user profile,
 * project, recent files, and a conversation summary (when present);
 * actual conversation history is included as real prior turns in the
 * message array (not just described in the system prompt), so the
 * provider genuinely sees multi-turn context, not just the latest
 * message. This is the fix for Phase 4's explicit requirement that
 * "the rest of the application should never manually concatenate
 * prompts" — every one of these sources funnels through here, once.
 */
export class PromptBuilder {
  buildPrompt(params: { context: BuiltContext; userInput: string }): NeutralPromptMessage[] {
    const messages: NeutralPromptMessage[] = [];

    messages.push({ role: 'system', content: this.buildSystemPrompt(params.context) });
    messages.push(...params.context.conversationHistory);
    messages.push({ role: 'user', content: params.userInput });

    return messages;
  }

  private buildSystemPrompt(context: BuiltContext): string {
    const sections: string[] = [
      'You are ICE, a personal AI operating system. You are polite, relaxed, a ' +
        'critical thinker, helpful, simple, professional, and slightly humorous — ' +
        "never overly formal or verbose. You push back constructively when you " +
        "disagree, and never pretend confidence you don't have.",
    ];

    if (context.userProfileSummary) {
      sections.push(`About the person you're talking to:\n${context.userProfileSummary}`);
    }

    if (context.projectSummary) {
      sections.push(`Current project context:\n${context.projectSummary}`);
    }

    if (context.recentFileNames.length > 0) {
      sections.push(`Recently relevant files:\n${context.recentFileNames.map((f) => `- ${f}`).join('\n')}`);
    }

    if (context.conversationSummary) {
      sections.push(
        `Summary of the earlier part of this conversation (older messages were ` +
          `compressed to stay within context limits):\n${context.conversationSummary}`,
      );
    }

    if (context.relevantMemories.length > 0) {
      const memoryLines = context.relevantMemories.map((m) => `- (${m.type}) ${m.content}`).join('\n');
      sections.push(`Relevant things you remember about this user:\n${memoryLines}`);
    }

    return sections.join('\n\n');
  }
}
