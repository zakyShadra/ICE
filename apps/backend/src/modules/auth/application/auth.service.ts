import type { PrismaClient } from '@prisma/client';
import type {
  AuthSession,
  IIdentityProvider,
  LoginInput,
  RefreshInput,
  RegisterInput,
} from '../domain/auth.types.js';

/**
 * AuthService — Application layer.
 *
 * Orchestrates identity (via IIdentityProvider) with ICE's own
 * `user_profiles` row (Document 3, Section 2.1: "extended 1:1"). This
 * is the one piece of real business logic in the Auth module: after a
 * successful Supabase signup, a corresponding UserProfile + default
 * UserSettings row must exist before the user can meaningfully use
 * ICE — the identity provider has no idea `user_profiles` exists, and
 * shouldn't.
 */
export class AuthService {
  constructor(
    private readonly identityProvider: IIdentityProvider,
    private readonly prisma: PrismaClient,
  ) {}

  async register(input: RegisterInput): Promise<AuthSession> {
    const session = await this.identityProvider.register(input);

    await this.prisma.userProfile.upsert({
      where: { id: session.userId },
      create: {
        id: session.userId,
        settings: {
          create: {
            enabledProviders: ['anthropic', 'ollama'],
            defaultRoutingMode: 'auto',
          },
        },
      },
      update: {},
    });

    return session;
  }

  async login(input: LoginInput): Promise<AuthSession> {
    return this.identityProvider.login(input);
  }

  async refresh(input: RefreshInput): Promise<AuthSession> {
    return this.identityProvider.refresh(input);
  }

  async logout(accessToken: string): Promise<void> {
    await this.identityProvider.logout(accessToken);
  }
}
