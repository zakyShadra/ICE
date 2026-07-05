/**
 * Auth module — Domain layer.
 *
 * Deliberately does NOT define "how to hash a password" or "how to
 * issue a JWT" — Supabase owns all of that (Document 3, Section 5).
 * This domain layer only defines the shape of what ICE's backend
 * forwards and returns, keeping the module honest about being a proxy,
 * not an identity provider.
 */

export interface AuthSession {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RegisterInput {
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

/**
 * IIdentityProvider — the boundary between this module and Supabase.
 * Everything module-specific about "we currently use Supabase for
 * identity" lives behind this interface (implemented in the
 * infrastructure layer) — if that ever changed, only the
 * infrastructure implementation would need to, per Document 2's
 * replaceable-module principle.
 */
export interface IIdentityProvider {
  register(input: RegisterInput): Promise<AuthSession>;
  login(input: LoginInput): Promise<AuthSession>;
  refresh(input: RefreshInput): Promise<AuthSession>;
  logout(accessToken: string): Promise<void>;
}

export class IdentityProviderError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'IdentityProviderError';
  }
}
