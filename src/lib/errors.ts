// ─── Typed error hierarchy ────────────────────────────────────────────────────

export type AppErrorCode =
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'LLM_ERROR'
  | 'INGESTION_ERROR'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'INTERNAL_ERROR';

export interface AppErrorOptions {
  message: string;
  cause?: unknown;
  /** Extra context attached to Sentry breadcrumbs / logs. */
  context?: Record<string, unknown>;
}

// ─── Base class ───────────────────────────────────────────────────────────────

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly context: Record<string, unknown>;

  constructor(code: AppErrorCode, { message, cause, context = {} }: AppErrorOptions) {
    super(message, { cause });
    this.name = code;
    this.code = code;
    this.context = context;
  }
}

// ─── Concrete error types ─────────────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('NOT_FOUND', opts);
  }
}

export class ValidationError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('VALIDATION_ERROR', opts);
  }
}

export class LlmError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('LLM_ERROR', opts);
  }
}

export class IngestionError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('INGESTION_ERROR', opts);
  }
}

export class AuthError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('AUTH_ERROR', opts);
  }
}

export class RateLimitError extends AppError {
  constructor(opts: AppErrorOptions) {
    super('RATE_LIMIT_ERROR', opts);
  }
}

// ─── HTTP status mapping ──────────────────────────────────────────────────────

export function httpStatusForError(error: AppError): number {
  switch (error.code) {
    case 'NOT_FOUND':
      return 404;
    case 'VALIDATION_ERROR':
      return 422;
    case 'AUTH_ERROR':
      return 401;
    case 'RATE_LIMIT_ERROR':
      return 429;
    case 'LLM_ERROR':
    case 'INGESTION_ERROR':
    case 'INTERNAL_ERROR':
      return 500;
  }
}

// ─── Safe async wrapper ───────────────────────────────────────────────────────

type Success<T> = { ok: true; data: T };
type Failure = { ok: false; error: AppError };
export type Result<T> = Success<T> | Failure;

/**
 * Wraps an async operation and returns a typed Result instead of throwing.
 * Unhandled errors are coerced to AppError with code INTERNAL_ERROR.
 */
export async function tryCatch<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof AppError) {
      return { ok: false, error };
    }
    return {
      ok: false,
      error: new AppError('INTERNAL_ERROR', {
        message: 'An unexpected error occurred',
        cause: error,
      }),
    };
  }
}
