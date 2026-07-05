import type { PrismaClient } from '@prisma/client';
import type { IProfileRepository, UpdateProfileInput, UserProfile } from '../domain/profile.types.js';

/**
 * PrismaProfileRepository — Infrastructure layer. The ONLY file in the
 * Profile module allowed to import @prisma/client, per the lint rule
 * in eslint.config.mjs (Document 2, Section 4's dependency rules
 * applied to backend-owned entities, not just Core's).
 */
export class PrismaProfileRepository implements IProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(userId: string): Promise<UserProfile | null> {
    const record = await this.prisma.userProfile.findUnique({ where: { id: userId } });
    if (!record) return null;
    return this.toDomain(record);
  }

  async update(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    const record = await this.prisma.userProfile.update({
      where: { id: userId },
      data: { displayName: input.displayName },
    });
    return this.toDomain(record);
  }

  private toDomain(record: {
    id: string;
    displayName: string | null;
    onboardedAt: Date | null;
    createdAt: Date;
  }): UserProfile {
    return {
      id: record.id,
      displayName: record.displayName,
      onboardedAt: record.onboardedAt?.toISOString() ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  }
}
