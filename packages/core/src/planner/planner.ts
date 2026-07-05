import type { AgentStepPlan } from '../agent/agent.js';

export type PlanDecision =
  | { kind: 'single_response' }
  | { kind: 'agent_task'; goal: string; steps: AgentStepPlan[] };

/**
 * Planner — Document 2, Section 3.1: decomposes a request into a plan.
 * Never executes anything itself — planning and doing are separated
 * deliberately (Document 2, Section 3.1's responsibility table).
 *
 * V1's classification heuristic is intentionally simple: a small set of
 * explicit trigger phrases route to Agent mode; everything else is a
 * normal chat turn. Document 1's roadmap places a more sophisticated,
 * model-assisted planner behind later milestones — this is the correct,
 * honest scope for a V1 Planner, not a shortcut standing in for a
 * "real" implementation.
 */
export class Planner {
  private readonly agentTriggerPhrases = ['summarize this and truncate', 'run the truncate tool'];

  plan(userInput: string): PlanDecision {
    const normalized = userInput.toLowerCase();

    const triggered = this.agentTriggerPhrases.some((phrase) => normalized.includes(phrase));

    if (!triggered) {
      return { kind: 'single_response' };
    }

    return {
      kind: 'agent_task',
      goal: userInput,
      steps: [
        {
          toolName: 'text_truncate',
          input: { text: userInput, maxLength: 120 },
        },
      ],
    };
  }
}
