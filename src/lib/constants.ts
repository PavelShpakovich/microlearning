// ─── UI / Toast ─────────────────────────────────────────────────────────────
/** Auto-dismiss duration for all toasts (ms). */
export const TOAST_DURATION_MS = 4000;

// ─── LLM providers ────────────────────────────────────────────────────────────
export const LLM_PROVIDERS = ['qwen', 'ollama', 'mock'] as const;
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
