import type { IProfileRepository, UpdateProfileInput, UserProfile } from '../domain/profile.types.js';

class ProfileNotFoundError extends Error {
  readonly code = 'PROFILE_NOT_FOUND';
  constructor(userId: string) {
    super(`Profile not found for user: ${userId}`);
  }
}

export class ProfileService {
  constructor(private readonly repository: IProfileRepository) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const profile = await this.repository.findById(userId);
    if (!profile) throw new ProfileNotFoundError(userId);
    return profile;
  }

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserProfile> {
    return this.repository.update(userId, input);
  }
}

export { ProfileNotFoundError };
