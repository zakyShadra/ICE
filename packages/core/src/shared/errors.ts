import type { IceErrorShape } from '@ice/types';

/**
 * Base class for every domain error thrown out of ICE Core.
 *
 * Per Document 2, Section 7.4: the backend's centralized error-handling
 * middleware catches these by type and maps each to an appropriate HTTP
 * status — Core itself never knows or cares about HTTP.
 */
export abstract class IceError extends Error implements IceErrorShape {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class MemoryNotFoundError extends IceError {
  readonly code = 'MEMORY_NOT_FOUND';
  constructor(memoryId: string) {
    super(`Memory record not found: ${memoryId}`);
  }
}

export class PermissionDeniedError extends IceError {
  readonly code = 'PERMISSION_DENIED';
  constructor(actionDescription: string) {
    super(`Action denied by Permission Manager: ${actionDescription}`);
  }
}

export class ProviderUnavailableError extends IceError {
  readonly code = 'PROVIDER_UNAVAILABLE';
  constructor(providerId: string, reason: string) {
    super(`Provider "${providerId}" is unavailable: ${reason}`);
  }
}

export class NoProviderAvailableError extends IceError {
  readonly code = 'NO_PROVIDER_AVAILABLE';
  constructor() {
    super('No AI provider is configured or available to handle this request.');
  }
}

export class ToolNotFoundError extends IceError {
  readonly code = 'TOOL_NOT_FOUND';
  constructor(toolName: string) {
    super(`Tool not found in registry: ${toolName}`);
  }
}

export class ToolExecutionError extends IceError {
  readonly code = 'TOOL_EXECUTION_FAILED';
  constructor(toolName: string, reason: string) {
    super(`Tool "${toolName}" failed to execute: ${reason}`);
  }
}
