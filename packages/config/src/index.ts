import { z } from 'zod';

/**
 * ICE Config — single source of truth for environment configuration.
 *
 * Per Document 2 (System Architecture), Section 7.5: all environment
 * variables are declared and validated here, once. Any app or package
 * that needs config imports `loadConfig()` from this package rather
 * than reading `process.env` directly. This is what makes a
 * misconfiguration a loud startup failure instead of a confusing
 * runtime bug three layers deep.
 */

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // --- Server ---
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // --- Supabase ---
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),

  // --- Database ---
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1).optional(),

  // --- AI Providers (all optional; Router adapts to whichever exist) ---
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  QWEN_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),
});

export type IceConfig = z.infer<typeof configSchema>;

let cachedConfig: IceConfig | undefined;

/**
 * Loads and validates configuration from `process.env`.
 * Throws synchronously (and loudly) on startup if required
 * variables are missing or malformed — this is intentional:
 * a service should refuse to boot with bad config rather than
 * fail confusingly on the first real request.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): IceConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const result = configSchema.safeParse(env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `[@ice/config] Invalid environment configuration:\n${issues}\n\n` +
        'Check your .env file against .env.example.',
    );
  }

  cachedConfig = result.data;
  return cachedConfig;
}

/** Test-only helper to reset the cached config between test runs. */
export function __resetConfigCacheForTests(): void {
  cachedConfig = undefined;
}
