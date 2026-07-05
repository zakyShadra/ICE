import type { ISettingsRepository, UpdateSettingsInput, UserSettings } from '../domain/settings.types.js';

/**
 * SettingsService — deliberately thin. AuthService already creates a
 * default UserSettings row on registration (Phase 3 Part A), so
 * `getOrDefault` exists mainly to handle accounts created before that
 * logic existed, or any future direct-DB edge case — falling back to
 * safe defaults rather than a 404 for what should always exist.
 */
export class SettingsService {
  constructor(private readonly repository: ISettingsRepository) {}

  async getOrDefault(userId: string): Promise<UserSettings> {
    const existing = await this.repository.find(userId);
    if (existing) return existing;
    return this.repository.upsert(userId, {});
  }

  update(userId: string, input: UpdateSettingsInput): Promise<UserSettings> {
    return this.repository.upsert(userId, input);
  }
}
