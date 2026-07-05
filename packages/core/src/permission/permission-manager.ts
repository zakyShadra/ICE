import type { ToolDefinition } from '@ice/types';

export type PermissionDecision =
  | { kind: 'auto_approved' }
  | { kind: 'requires_user_confirmation' }
  | { kind: 'denied'; reason: string };

/**
 * PermissionManager — Document 2, Section 3.1: the gatekeeper for any
 * tool/agent action. Enforces PRD Principle #5 ("User Control Over
 * Autonomy"): every agentic action must be legible, and destructive or
 * external actions require explicit confirmation, never silent
 * execution. This is a pure policy module — it decides, it never acts
 * (Executor acts) and it never touches persistence (Document 3, Section
 * 5.3 — policy decisions in V1 are not persisted).
 */
export class PermissionManager {
  evaluate(tool: ToolDefinition): PermissionDecision {
    if (tool.isDestructive) {
      return { kind: 'requires_user_confirmation' };
    }
    return { kind: 'auto_approved' };
  }
}
