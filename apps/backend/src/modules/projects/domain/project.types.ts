export interface Project {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
}

export interface CreateProjectInput {
  userId: string;
  name: string;
}

export interface UpdateProjectInput {
  projectId: string;
  userId: string;
  name: string;
}

export interface IProjectRepository {
  create(input: CreateProjectInput): Promise<Project>;
  list(userId: string): Promise<Project[]>;
  getById(projectId: string, userId: string): Promise<Project | null>;
  update(input: UpdateProjectInput): Promise<Project>;
  delete(projectId: string, userId: string): Promise<void>;
}

export class ProjectNotFoundError extends Error {
  readonly code = 'PROJECT_NOT_FOUND';
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`);
  }
}
