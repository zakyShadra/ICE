import type { AgentStep } from '@ice/types';
import { PermissionDeniedError, ToolExecutionError } from '../shared/errors.js';
import type { PermissionManager } from '../permission/permission-manager.js';
import type { ToolRegistry } from '../tools/tool-registry.js';

export interface ExecutionRequest {
  step: Pick<AgentStep, 'toolName' | 'input'>;
  /** Set by the caller once a user has explicitly confirmed a destructive action. */
  userConfirmed: boolean;
}

/**
 * Executor — Document 2, Section 3.1: the ONLY module allowed to
 * actually perform a tool side-effect, and only after Permission
 * Manager has approved it (Document 2, Section 4, Rule 3). Agent never
 * calls a tool directly — it always goes through here.
 */
export class Executor {
  constructor(
    private readonly tools: ToolRegistry,
    private readonly permissions: PermissionManager,
  ) {}

  async execute(request: ExecutionRequest): Promise<Record<string, unknown>> {
    const tool = this.tools.get(request.step.toolName);
    const decision = this.permissions.evaluate(tool);

    if (decision.kind === 'denied') {
      throw new PermissionDeniedError(decision.reason);
    }

    if (decision.kind === 'requires_user_confirmation' && !request.userConfirmed) {
      throw new PermissionDeniedError(
        `Tool "${tool.name}" is destructive and requires explicit user confirmation before executing.`,
      );
    }

    try {
      return await tool.execute(request.step.input);
    } catch (cause) {
      const reason = cause instanceof Error ? cause.message : String(cause);
      throw new ToolExecutionError(tool.name, reason);
    }
  }
}
