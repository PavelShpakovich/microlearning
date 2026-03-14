import { z } from 'zod';

const envSchema = z.object({
  // Supabase — public (safe for client)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Supabase — server only
  SUPABASE_SERVICE_KEY: z.string().min(1, 'SUPABASE_SERVICE_KEY is required'),

  // NextAuth
  NEXT_PUBLIC_APP_URL: z.string().url('NEXT_PUBLIC_APP_URL must be a valid URL'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),

  // LLM
  LLM_PROVIDER: z.enum(['groq', 'openai', 'anthropic', 'ollama', 'gemini', 'qwen', 'mock']),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-specdec'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash-exp'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-3-haiku-20240307'),
  QWEN_API_KEY: z.string().optional(),
  QWEN_MODEL: z.string().default('qwen-plus'),
  QWEN_BASE_URL: z.string().url().optional(),
  OLLAMA_BASE_URL: z.string().url().optional(),
  OLLAMA_MODEL: z.string().default('llama3'),

  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  NEXT_PUBLIC_TELEGRAM_BOT_URL: z.string().url().optional(),
  // Secret token for Telegram webhook verification (set in BotFather/setWebhook)
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),

  // Billing feature flag — set to "true" to enable Webpay checkout and pricing UI
  NEXT_PUBLIC_ENABLE_SUBSCRIPTIONS: z.string().optional(),

  // WEBPAY
  WEBPAY_API_BASE_URL: z.string().url().optional(),
  WEBPAY_MERCHANT_ID: z.string().optional(),
  WEBPAY_SECRET_KEY: z.string().optional(),
  WEBPAY_WEBHOOK_SECRET: z.string().optional(),
  WEBPAY_SUCCESS_PATH: z.string().optional().default('/settings/plan?billing=success'),
  WEBPAY_CANCEL_PATH: z.string().optional().default('/settings/plan?billing=cancelled'),
  WEBPAY_FAIL_PATH: z.string().optional().default('/settings/plan?billing=failed'),

  // Support
  SUPPORT_EMAIL: z.string().email().optional().default('support@example.com'),
  ADMIN_EMAILS: z.string().optional(), // Comma-separated email list

  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // Resend (transactional email)
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // Cron security
  CRON_SECRET: z.string().optional(),

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
    throw new Error(`[ERROR] Invalid environment variables:\n${formatted}`);
  }
  return result.data;
}

export const env = validateEnv();
export type Env = z.infer<typeof envSchema>;
