export interface UserSettings {
  userId: string;
  enabledProviders: string[];
  defaultRoutingMode: string;
  memoryVisibilityOptIn: boolean;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  enabledProviders?: string[];
  defaultRoutingMode?: string;
  memoryVisibilityOptIn?: boolean;
}

export interface ISettingsRepository {
  find(userId: string): Promise<UserSettings | null>;
  upsert(userId: string, input: UpdateSettingsInput): Promise<UserSettings>;
}
