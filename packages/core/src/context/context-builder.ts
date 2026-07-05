import type { MemoryRecord, NeutralPromptMessage } from '@ice/types';
import type { IMemory } from '../memory/memory.types.js';

export interface BuiltContext {
  relevantMemories: MemoryRecord[];
  conversationHistory: NeutralPromptMessage[];
  conversationSummary?: string;
  userProfileSummary?: string;
  projectSummary?: string;
  recentFileNames: string[];
  runtimeMetadata: {
    generatedAt: string;
    projectId?: string;
    sessionId?: string;
  };
}

/**
 * Optional collaborators — Phase 4 extension. ContextBuilder still only
 * depends on interfaces (Document 2, Section 6.3's DI philosophy), but
 * these are backend-owned concerns (user profile, projects, files all
 * live in apps/backend's Prisma repositories per Phase 3, NOT in Core —
 * Core doesn't own persistence for anything except Memory). Each
 * provider is optional and defaults to returning nothing, so Brain
 * keeps working exactly as before for any caller that doesn't wire
 * them in — this is additive, not a breaking change to Phase 1's contract.
 */
export interface IUserProfileContextProvider {
  getProfileSummary(userId: string): Promise<string | undefined>;
}

export interface IProjectContextProvider {
  getProjectSummary(projectId: string): Promise<string | undefined>;
}

export interface IFileContextProvider {
  listRecentFileNames(userId: string, projectId?: string): Promise<string[]>;
}

export interface ContextBuilderCollaborators {
  userProfileProvider?: IUserProfileContextProvider;
  projectProvider?: IProjectContextProvider;
  fileProvider?: IFileContextProvider;
}

/**
 * ContextBuilder — Document 2, Section 3.1: assembles what's relevant
 * for a request. Deliberately does NOT decide what's true (that's
 * Memory's job) — only what's relevant to include, and how much of it
 * fits.
 *
 * Phase 4 extension: now gathers conversation history (passed in by the
 * caller — Core doesn't own message persistence), user profile,
 * project, and recent file context, in addition to Phase 1's relevant
 * memories. Knowledge Memory retrieval (RAG) still plugs into
 * `relevantMemories` once it ships (Document 1, Section 6.2).
 */
export class ContextBuilder {
  constructor(
    private readonly memory: IMemory,
    private readonly collaborators: ContextBuilderCollaborators = {},
  ) {}

  async buildContext(params: {
    userId: string;
    projectId?: string;
    sessionId?: string;
    inputText: string;
    conversationHistory?: NeutralPromptMessage[];
    conversationSummary?: string;
  }): Promise<BuiltContext> {
    const relevantMemories = await this.memory.retrieveRelevant({
      userId: params.userId,
      projectId: params.projectId,
      types: ['session', 'long_term', 'project'],
      queryText: params.inputText,
      limit: 10,
    });

    const [userProfileSummary, projectSummary, recentFileNames] = await Promise.all([
      this.collaborators.userProfileProvider?.getProfileSummary(params.userId),
      params.projectId
        ? this.collaborators.projectProvider?.getProjectSummary(params.projectId)
        : Promise.resolve(undefined),
      this.collaborators.fileProvider?.listRecentFileNames(params.userId, params.projectId) ?? Promise.resolve([]),
    ]);

    return {
      relevantMemories,
      conversationHistory: params.conversationHistory ?? [],
      conversationSummary: params.conversationSummary,
      userProfileSummary,
      projectSummary,
      recentFileNames: recentFileNames ?? [],
      runtimeMetadata: {
        generatedAt: new Date().toISOString(),
        projectId: params.projectId,
        sessionId: params.sessionId,
      },
    };
  }
}
