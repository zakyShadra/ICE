import type { IceConfig } from '@ice/config';
import {
  IdentityProviderError,
  type AuthSession,
  type IIdentityProvider,
  type LoginInput,
  type RefreshInput,
  type RegisterInput,
} from '../domain/auth.types.js';

/**
 * SupabaseIdentityProvider — Infrastructure layer.
 *
 * The ONLY file in the entire backend that calls Supabase's GoTrue
 * (Auth) REST API. Implements IIdentityProvider by forwarding to
 * Supabase and relaying the result verbatim — this backend never mints
 * its own token and never stores a password, satisfying Document 3,
 * Section 5.2's "Supabase Auth issues and owns identity; the backend
 * only verifies" even while offering these as first-class backend
 * endpoints for clients that shouldn't hold Supabase credentials
 * directly (e.g. a future CLI).
 */
export class SupabaseIdentityProvider implements IIdentityProvider {
  private readonly baseUrl: string;
  private readonly anonKey: string;

  constructor(config: IceConfig) {
    this.baseUrl = `${config.SUPABASE_URL}/auth/v1`;
    this.anonKey = config.SUPABASE_ANON_KEY;
  }

  async register(input: RegisterInput): Promise<AuthSession> {
    return this.call('/signup', input);
  }

  async login(input: LoginInput): Promise<AuthSession> {
    return this.call('/token?grant_type=password', input);
  }

  async refresh(input: RefreshInput): Promise<AuthSession> {
    return this.call('/token?grant_type=refresh_token', { refresh_token: input.refreshToken });
  }

  async logout(accessToken: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/logout`, {
      method: 'POST',
      headers: {
        apikey: this.anonKey,
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok && response.status !== 204) {
      const body = await response.text();
      throw new IdentityProviderError('LOGOUT_FAILED', body, response.status);
    }
  }

  private async call(path: string, body: Record<string, unknown>): Promise<AuthSession> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        apikey: this.anonKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as Record<string, unknown>;

    if (!response.ok) {
      const message = (data['error_description'] as string) ?? (data['msg'] as string) ?? 'Auth request failed';
      throw new IdentityProviderError((data['error'] as string) ?? 'AUTH_FAILED', message, response.status);
    }

    const user = data['user'] as Record<string, unknown>;

    return {
      userId: user['id'] as string,
      email: user['email'] as string,
      accessToken: data['access_token'] as string,
      refreshToken: data['refresh_token'] as string,
      expiresAt: Date.now() + ((data['expires_in'] as number) ?? 3600) * 1000,
    };
  }
}
