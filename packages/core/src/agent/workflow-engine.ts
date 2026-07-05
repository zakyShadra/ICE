import { randomUUID } from 'node:crypto';
import type { AgentStep, AgentStepStatus, AgentTask } from '@ice/types';

/**
 * WorkflowEngine — Document 2, Section 3.1 & Section 12.1: the
 * structural, inspectable record of a plan. Kept deliberately separate
 * from Agent (which decides *what* to do next) so a long-running task's
 * state can be shown to the user transparently (PRD Principle #5) and,
 * later, made resumable across process restarts without Agent's
 * decision logic needing to change.
 *
 * V1 implementation is intentionally in-memory and minimal, per
 * Document 2, Section 12.1's explicit recommendation — this is the
 * correct amount of implementation for what V1's Agent Mode
 * (Document 1, Milestone 5) actually needs.
 */
export class WorkflowEngine {
  private readonly tasks = new Map<string, AgentTask>();

  createTask(params: { userId: string; projectId?: string; goal: string }): AgentTask {
    const task: AgentTask = {
      id: randomUUID(),
      userId: params.userId,
      projectId: params.projectId,
      goal: params.goal,
      steps: [],
      status: 'planning',
    };
    this.tasks.set(task.id, task);
    return task;
  }

  addStep(taskId: string, toolName: string, input: Record<string, unknown>): AgentStep {
    const task = this.getTask(taskId);
    const step: AgentStep = {
      id: randomUUID(),
      taskId,
      stepIndex: task.steps.length,
      status: 'pending',
      toolName,
      input,
    };
    task.steps.push(step);
    task.status = 'in_progress';
    return step;
  }

  updateStepStatus(
    taskId: string,
    stepId: string,
    status: AgentStepStatus,
    output?: Record<string, unknown>,
  ): AgentStep {
    const task = this.getTask(taskId);
    const step = task.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found on task ${taskId}`);
    }
    step.status = status;
    step.output = output;
    if (status === 'completed' || status === 'executing') {
      step.executedAt = new Date().toISOString();
    }
    this.recomputeTaskStatus(task);
    return step;
  }

  getTask(taskId: string): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Agent task not found: ${taskId}`);
    }
    return task;
  }

  private recomputeTaskStatus(task: AgentTask): void {
    if (task.steps.some((s) => s.status === 'failed')) {
      task.status = 'failed';
      return;
    }
    if (task.steps.length > 0 && task.steps.every((s) => s.status === 'completed' || s.status === 'denied')) {
      task.status = 'completed';
    }
  }
}
