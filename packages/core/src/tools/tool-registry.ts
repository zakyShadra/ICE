import type { ToolDefinition } from '@ice/types';
import { ToolNotFoundError } from '../shared/errors.js';

/**
 * ToolRegistry — Document 2, Section 3.1: what Executor is allowed to
 * call. Tools are deliberately dumb/stateless (they know nothing about
 * Agent's plan or Memory) — registration and lookup only.
 *
 * V1 ships with a small, safe set of real tools rather than a framework
 * for hypothetical future tools, per the "avoid over-engineering"
 * instruction repeated in every prior document.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  get(toolName: string): ToolDefinition {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(toolName);
    }
    return tool;
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }
}

/**
 * A real, working, non-destructive V1 tool: summarizes arbitrary text by
 * truncating to a target length with a clear marker. Deliberately simple
 * — it exists to prove the Executor/Permission/Tool pipeline end-to-end
 * without needing an external AI call inside a tool (which would create
 * a Router-inside-a-tool dependency loop worth avoiding in V1).
 */
export const textTruncateTool: ToolDefinition<{ text: string; maxLength: number }, { result: string }> = {
  name: 'text_truncate',
  description: 'Truncates text to a maximum length, appending an ellipsis marker if cut.',
  isDestructive: false,
  async execute(input) {
    const { text, maxLength } = input;
    if (text.length <= maxLength) {
      return { result: text };
    }
    return { result: `${text.slice(0, maxLength)}…` };
  },
};
