import { z } from 'zod';

const envSchema = z.object({
  // Supabase — public (safe for client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Supabase — server only
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),

  // NextAuth
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),

  // LLM — Qwen is the only production provider; 'mock' is for tests/CI.
  LLM_PROVIDER: z.enum(['qwen', 'mock']),
  QWEN_API_KEY: z.string().optional(),
  QWEN_MODEL: z.string().default('qwen-plus'),
  QWEN_BASE_URL: z.string().url().optional(),

  // Support
  SUPPORT_EMAIL: z.string().email().optional().default('support@example.com'),
  ADMIN_EMAILS: z.string().optional(), // Comma-separated email list

  // Resend (transactional email)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().optional(),

  // Maps
  NEXT_PUBLIC_YANDEX_MAPS_KEY: z.string().optional(),

  // Cron security
  CRON_SECRET: z.string().min(1, 'CRON_SECRET is required'),

  // Node
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/**
 * Validates all environment variables at module load time.
 * The application will throw at startup if any required var is missing or malformed.
 */
function validateEnv() {
  const result = envSchema
    .superRefine((data, ctx) => {
      if (data.LLM_PROVIDER === 'qwen' && !data.QWEN_API_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['QWEN_API_KEY'],
          message: 'QWEN_API_KEY is required when LLM_PROVIDER=qwen',
        });
      }
    })
    .safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((e) => `  • ${String(e.path.join('.'))}: ${e.message}`)
      .join('\n');
    throw new Error(`[ERROR] Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}

export const env = validateEnv();
