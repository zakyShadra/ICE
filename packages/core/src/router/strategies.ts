import type { IProviderAdapter, RoutingStrategy } from './router.types.js';
import type { RouterRequest } from '@ice/types';
import { NoProviderAvailableError } from '../shared/errors.js';

/**
 * CapabilityBasedStrategy — the V1 routing strategy.
 *
 * Per Document 1, Section 6.1: V1 needs the Router to prove auto- and
 * manual-selection work end to end; a full cost/latency-aware strategy
 * is Document 1's mid-term goal, not a V1 requirement. This strategy is
 * deliberately simple and honest about being simple, per the
 * "avoid over-engineering" instruction repeated across every document
 * in this series — but it is a REAL, working strategy, not a stub:
 * manual override is fully respected, and task-type-to-provider
 * preference is a real (if simple) rule set.
 */
export class CapabilityBasedStrategy implements RoutingStrategy {
  /**
   * Preference order per task type. First available adapter in the list
   * wins. This table is the entire "capability model" for V1 — expanding
   * it to weigh cost/latency is a deliberate, separate future change
   * (Document 1, Section 3.2), not something to sneak in here.
   */
  private readonly preferenceByTaskType: Record<string, ReturnType<RouterRequest['taskType']>[]> =
    {
      chat: ['anthropic', 'openai', 'google', 'openrouter', 'deepseek', 'qwen', 'ollama'] as never,
      coding: ['anthropic', 'deepseek', 'openai', 'google', 'openrouter', 'qwen', 'ollama'] as never,
      agent_step: ['anthropic', 'openai', 'google', 'openrouter', 'deepseek', 'qwen', 'ollama'] as never,
      summarization: ['openai', 'anthropic', 'google', 'openrouter', 'deepseek', 'qwen', 'ollama'] as never,
    };

  selectProvider(
    request: RouterRequest,
    availableAdapters: IProviderAdapter[],
  ): { adapter: IProviderAdapter; reason: string } {
    if (request.preferredProvider) {
      const manual = availableAdapters.find(
        (adapter) => adapter.id === request.preferredProvider && adapter.isAvailable(),
      );
      if (manual) {
        return { adapter: manual, reason: 'manual_override' };
      }
      // Falls through to auto-selection if the manually requested
      // provider isn't actually available — never silently fail a
      // request just because a preference couldn't be honored.
    }

    const preferenceOrder = this.preferenceByTaskType[request.taskType] ?? [];

    for (const providerId of preferenceOrder) {
      const adapter = availableAdapters.find((a) => a.id === providerId && a.isAvailable());
      if (adapter) {
        return { adapter, reason: `auto_selected_for_task_type:${request.taskType}` };
      }
    }

    const anyAvailable = availableAdapters.find((a) => a.isAvailable());
    if (anyAvailable) {
      return { adapter: anyAvailable, reason: 'fallback_any_available' };
    }

    throw new NoProviderAvailableError();
  }
}
