import { z } from 'zod';

const envSchema = z.object({
  // Supabase — public (safe for client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Supabase — server only
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),

  // LLM
  LLM_PROVIDER: z.enum(['groq', 'openai', 'anthropic', 'ollama', 'mock']),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama3-70b-8192'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-haiku-20240307'),
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().default('llama3'),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Node
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/**
 * Validates all environment variables at module load time.
 * The application will throw at startup if any required var is missing or malformed.
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.issues
      .map((e) => `  • ${String(e.path.join('.'))}: ${e.message}`)
      .join('\n');
    throw new Error(`❌ Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
