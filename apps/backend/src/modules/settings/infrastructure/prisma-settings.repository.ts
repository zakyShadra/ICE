import type { PrismaClient } from '@prisma/client';
import type { ISettingsRepository, UpdateSettingsInput, UserSettings } from '../domain/settings.types.js';

/**
 * PrismaSettingsRepository — backs Document 3's `user_settings` table,
 * which was created in Phase 1 specifically as the "implicit V1
 * Settings surface" Document 1, Section 6.3 required — this is where
 * that table finally gets a REST surface over it.
 */
export class PrismaSettingsRepository implements ISettingsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async find(userId: string): Promise<UserSettings | null> {
    const record = await this.prisma.userSettings.findUnique({ where: { userId } });
    return record ? this.toDomain(record) : null;
  }

  async upsert(userId: string, input: UpdateSettingsInput): Promise<UserSettings> {
    const record = await this.prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        enabledProviders: input.enabledProviders ?? ['anthropic', 'ollama'],
        defaultRoutingMode: input.defaultRoutingMode ?? 'auto',
        memoryVisibilityOptIn: input.memoryVisibilityOptIn ?? true,
      },
      update: {
        enabledProviders: input.enabledProviders,
        defaultRoutingMode: input.defaultRoutingMode,
        memoryVisibilityOptIn: input.memoryVisibilityOptIn,
      },
    });
    return this.toDomain(record);
  }

  private toDomain(record: {
    userId: string;
    enabledProviders: string[];
    defaultRoutingMode: string;
    memoryVisibilityOptIn: boolean;
    updatedAt: Date;
  }): UserSettings {
    return {
      userId: record.userId,
      enabledProviders: record.enabledProviders,
      defaultRoutingMode: record.defaultRoutingMode,
      memoryVisibilityOptIn: record.memoryVisibilityOptIn,
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}
