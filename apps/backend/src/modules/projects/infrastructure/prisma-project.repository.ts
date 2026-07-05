import type { PrismaClient } from '@prisma/client';
import {
  ProjectNotFoundError,
  type CreateProjectInput,
  type IProjectRepository,
  type Project,
  type UpdateProjectInput,
} from '../domain/project.types.js';

export class PrismaProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(input: CreateProjectInput): Promise<Project> {
    const record = await this.prisma.project.create({
      data: { userId: input.userId, name: input.name },
    });
    return this.toDomain(record);
  }

  async list(userId: string): Promise<Project[]> {
    const records = await this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((r) => this.toDomain(r));
  }

  async getById(projectId: string, userId: string): Promise<Project | null> {
    const record = await this.prisma.project.findFirst({ where: { id: projectId, userId } });
    return record ? this.toDomain(record) : null;
  }

  async update(input: UpdateProjectInput): Promise<Project> {
    const result = await this.prisma.project.updateMany({
      where: { id: input.projectId, userId: input.userId },
      data: { name: input.name },
    });
    if (result.count === 0) throw new ProjectNotFoundError(input.projectId);
    const updated = await this.prisma.project.findUniqueOrThrow({ where: { id: input.projectId } });
    return this.toDomain(updated);
  }

  async delete(projectId: string, userId: string): Promise<void> {
    const result = await this.prisma.project.deleteMany({ where: { id: projectId, userId } });
    if (result.count === 0) throw new ProjectNotFoundError(projectId);
  }

  private toDomain(record: { id: string; userId: string; name: string; createdAt: Date }): Project {
    return { id: record.id, userId: record.userId, name: record.name, createdAt: record.createdAt.toISOString() };
  }
}
