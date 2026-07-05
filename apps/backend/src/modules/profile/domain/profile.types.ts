export interface UserProfile {
  id: string;
  displayName: string | null;
  onboardedAt: string | null;
  createdAt: string;
}

export interface UpdateProfileInput {
  displayName?: string;
}

export interface IProfileRepository {
  findById(userId: string): Promise<UserProfile | null>;
  update(userId: string, input: UpdateProfileInput): Promise<UserProfile>;
}
