// ─── Card generation ─────────────────────────────────────────────────────────
/** Trigger new card generation when unseen count falls below this threshold.
    Set high enough to generate proactively before user runs out of cards. */
export const CARD_GENERATION_THRESHOLD = 15;
/** Number of cards to generate per AI batch. */
export const MAX_CARDS_PER_BATCH = 5;
/** Card count options shown in the generate-more picker. */
export const CARD_COUNT_OPTIONS = [5, 10, 15, 20] as const;
/** Max cards allowed in a single user generation request (matches CARD_COUNT_OPTIONS max). */
export const MAX_USER_CARD_REQUEST = 20;
/** Max cards fetched per study-session API request.
    High enough to load all existing cards in a single request for most themes. */
export const MAX_CARDS_PER_SESSION_FETCH = 100;
/** Show a "running low" toast warning when this many cards remain in the billing period. */
export const LOW_CARDS_THRESHOLD = 5;

// ─── UI / Toast ─────────────────────────────────────────────────────────────
/** Auto-dismiss duration for all toasts (ms). */
export const TOAST_DURATION_MS = 4000;

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
export const DATA_SOURCE_TYPES = ['text', 'pdf', 'docx', 'url'] as const;
export type DataSourceType = (typeof DATA_SOURCE_TYPES)[number];

// ─── Data source status ───────────────────────────────────────────────────────
export const DATA_SOURCE_STATUSES = ['pending', 'processing', 'ready', 'error'] as const;
export type DataSourceStatus = (typeof DATA_SOURCE_STATUSES)[number];

// ─── LLM providers ────────────────────────────────────────────────────────────
export const LLM_PROVIDERS = ['groq', 'openai', 'anthropic', 'ollama', 'gemini', 'mock'] as const;
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
