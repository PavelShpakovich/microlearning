// ─── Card generation ─────────────────────────────────────────────────────────
/** Trigger new card generation when unseen count falls below this threshold.
    Set high enough to generate proactively before user runs out of cards. */
export const CARD_GENERATION_THRESHOLD = 15;
/** Number of cards to generate per batch. */
export const MAX_CARDS_PER_BATCH = 10;

// ─── Session ─────────────────────────────────────────────────────────────────
export const SESSION_COOKIE_NAME = 'ml_session';

// ─── Rate limiting ────────────────────────────────────────────────────────────
/** Max generation requests per user per minute. */
export const RATE_LIMIT_GENERATE_RPM = 10;

// ─── File uploads ─────────────────────────────────────────────────────────────
/** 4.5 MB — Vercel body size limit on the Hobby plan. */
export const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
] as const;

// ─── Data source types ────────────────────────────────────────────────────────
export const DATA_SOURCE_TYPES = ['text', 'pdf', 'docx', 'url', 'youtube'] as const;
export type DataSourceType = (typeof DATA_SOURCE_TYPES)[number];

// ─── Data source status ───────────────────────────────────────────────────────
export const DATA_SOURCE_STATUSES = ['pending', 'processing', 'ready', 'error'] as const;
export type DataSourceStatus = (typeof DATA_SOURCE_STATUSES)[number];

// ─── LLM providers ────────────────────────────────────────────────────────────
export const LLM_PROVIDERS = ['groq', 'openai', 'anthropic', 'ollama', 'mock'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

// ─── Request headers ──────────────────────────────────────────────────────────
export const REQUEST_ID_HEADER = 'x-request-id';

// ─── SSRF protection — blocked private IP ranges ─────────────────────────────
export const BLOCKED_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^localhost$/i,
] as const;
