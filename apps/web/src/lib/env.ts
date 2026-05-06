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

  // LLM — primary provider used for generation; fallback used on errors.
  LLM_PROVIDER: z.enum(['qwen', 'deepseek', 'mock']),
  QWEN_API_KEY: z.string().optional(),
  QWEN_MODEL: z.string().default('qwen-plus'),
  QWEN_BASE_URL: z.string().url().optional(),

  DEEPSEEK_API_KEY: z.string().optional(),
  DEEPSEEK_MODEL: z.string().default('deepseek-v4-flash'),
  DEEPSEEK_BASE_URL: z.string().url().optional(),

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

  // RevenueCat / billing
  REVENUECAT_PROJECT_API_KEY: z.string().optional(),
  REVENUECAT_WEBHOOK_AUTH: z.string().optional(),

  // Feature flags
  // When true, only /, /privacy, /terms, /auth/callback and /api/* are served.
  // All other pages return 404. Used when the web UI is disabled for mobile-only mode.
  NEXT_PUBLIC_MOBILE_ONLY: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

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
      if (data.LLM_PROVIDER === 'deepseek' && !data.DEEPSEEK_API_KEY) {
        ctx.addIssue({
          code: 'custom',
          path: ['DEEPSEEK_API_KEY'],
          message: 'DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek',
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
