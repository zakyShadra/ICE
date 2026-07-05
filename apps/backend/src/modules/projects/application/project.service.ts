import {
  ProjectNotFoundError,
  type CreateProjectInput,
  type IProjectRepository,
  type Project,
} from '../domain/project.types.js';

export class ProjectService {
  constructor(private readonly repository: IProjectRepository) {}

  create(input: CreateProjectInput): Promise<Project> {
    return this.repository.create(input);
  }

  list(userId: string): Promise<Project[]> {
    return this.repository.list(userId);
  }

  async getById(projectId: string, userId: string): Promise<Project> {
    const project = await this.repository.getById(projectId, userId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
    return project;
  }

  update(projectId: string, userId: string, name: string): Promise<Project> {
    return this.repository.update({ projectId, userId, name });
  }

  delete(projectId: string, userId: string): Promise<void> {
    return this.repository.delete(projectId, userId);
  }
}
