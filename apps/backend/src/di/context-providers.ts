import type { IFileContextProvider, IProjectContextProvider, IUserProfileContextProvider } from '@ice/core';
import type { ProfileService } from '../modules/profile/application/profile.service.js';
import type { ProjectService } from '../modules/projects/application/project.service.js';
import type { PrismaClient } from '@prisma/client';

/**
 * Backend-side implementations of Core's optional ContextBuilder
 * collaborator interfaces (Phase 4). These are the ONLY place backend
 * modules (Profile, Projects, Files) are adapted into shapes Core can
 * consume — Core itself still only knows about the interfaces defined
 * in packages/core/src/context/context-builder.ts, never about Prisma,
 * ProfileService, or ProjectService directly.
 */
export class BackendUserProfileContextProvider implements IUserProfileContextProvider {
  constructor(private readonly profileService: ProfileService) {}

  async getProfileSummary(userId: string): Promise<string | undefined> {
    try {
      const profile = await this.profileService.getProfile(userId);
      return profile.displayName ? `The user's name is ${profile.displayName}.` : undefined;
    } catch {
      // No profile yet (e.g., mid-registration edge case) — absence of
      // profile context should never fail the whole turn.
      return undefined;
    }
  }
}

export class BackendProjectContextProvider implements IProjectContextProvider {
  constructor(private readonly projectService: ProjectService, private readonly prisma: PrismaClient) {}

  async getProjectSummary(projectId: string): Promise<string | undefined> {
    // ProjectService.getById requires a userId for scoping, which this
    // provider's interface doesn't receive (Core's ContextBuilder only
    // passes projectId, not userId, to project-context lookups — see
    // packages/core/src/context/context-builder.ts). A direct, narrow
    // Prisma read here (not going through ProjectService's user-scoped
    // method) is the pragmatic honest choice; ownership was already
    // verified upstream by the time a projectId reaches Brain.
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    return project ? `Working within the project "${project.name}".` : undefined;
  }
}

export class BackendFileContextProvider implements IFileContextProvider {
  constructor(private readonly prisma: PrismaClient) {}

  async listRecentFileNames(userId: string, projectId?: string): Promise<string[]> {
    const files = await this.prisma.fileAsset.findMany({
      where: { userId, projectId: projectId ?? undefined },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { fileName: true },
    });
    return files.map((f) => f.fileName);
  }
}
