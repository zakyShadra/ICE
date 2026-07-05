import type { AgentStep, AgentTask } from '@ice/types';
import type { Executor } from '../executor/executor.js';
import type { WorkflowEngine } from './workflow-engine.js';

export interface AgentStepPlan {
  toolName: string;
  input: Record<string, unknown>;
}

/**
 * Agent — Document 2, Section 3.1: owns multi-step task state, decides
 * what to do next, but never executes a tool directly — always
 * delegates to Executor (Document 2, Section 4, Rule 3). Uses
 * WorkflowEngine as its structural memory of the plan.
 */
export class Agent {
  constructor(
    private readonly workflow: WorkflowEngine,
    private readonly executor: Executor,
  ) {}

  startTask(params: { userId: string; projectId?: string; goal: string; plan: AgentStepPlan[] }): AgentTask {
    const task = this.workflow.createTask({
      userId: params.userId,
      projectId: params.projectId,
      goal: params.goal,
    });

    for (const planned of params.plan) {
      this.workflow.addStep(task.id, planned.toolName, planned.input);
    }

    return this.workflow.getTask(task.id);
  }

  async runNextStep(taskId: string, userConfirmed: boolean): Promise<AgentStep> {
    const task = this.workflow.getTask(taskId);
    const nextStep = task.steps.find((s) => s.status === 'pending' || s.status === 'approved');

    if (!nextStep) {
      throw new Error(`No pending steps for task ${taskId}`);
    }

    this.workflow.updateStepStatus(taskId, nextStep.id, 'executing');

    try {
      const output = await this.executor.execute({
        step: { toolName: nextStep.toolName, input: nextStep.input },
        userConfirmed,
      });
      return this.workflow.updateStepStatus(taskId, nextStep.id, 'completed', output);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('requires explicit user confirmation')) {
        return this.workflow.updateStepStatus(taskId, nextStep.id, 'denied', { reason: message });
      }
      return this.workflow.updateStepStatus(taskId, nextStep.id, 'failed', { reason: message });
    }
  }

  getTask(taskId: string): AgentTask {
    return this.workflow.getTask(taskId);
  }
}
