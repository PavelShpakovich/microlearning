import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getTranslations } from 'next-intl/server';
import { AppError, httpStatusForError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { REQUEST_ID_HEADER } from '@/lib/constants';

/**
 * Wraps an API route handler with:
 *  - Request ID generation and injection into response headers
 *  - Structured error logging with pino
 *  - Typed error → HTTP status mapping
 *
 * @example
 * export const GET = withApiHandler(async (req) => {
 *   return NextResponse.json({ ok: true });
 * });
 */
export function withApiHandler(
  handler: (req: Request, ctx?: unknown) => Promise<NextResponse>,
): (req: Request, ctx?: unknown) => Promise<NextResponse> {
  return async (req: Request, ctx?: unknown) => {
    const requestId = nanoid();
    const start = Date.now();

    try {
      const response = await handler(req, ctx);
      response.headers.set(REQUEST_ID_HEADER, requestId);

      logger.info(
        {
          requestId,
          method: req.method,
          url: req.url,
          status: response.status,
          durationMs: Date.now() - start,
        },
        'API request completed',
      );

      return response;
    } catch (err) {
      const durationMs = Date.now() - start;

      // Log the full error for debugging
      const errorToLog = err instanceof Error ? err : new Error(String(err));
      logger.error(
        {
          requestId,
          method: req.method,
          url: req.url,
          err: {
            message: errorToLog.message,
            stack: errorToLog.stack,
            name: errorToLog.name,
            // @ts-expect-error - capturing custom error properties
            code: err?.code,
            // @ts-expect-error - capturing custom error properties
            status: err?.status,
          },
          durationMs,
        },
        'API handler caught error',
      );

      if (err instanceof AppError) {
        const status = httpStatusForError(err);

        logger.warn(
          {
            requestId,
            method: req.method,
            url: req.url,
            errorCode: err.code,
            errorMessage: err.message,
            context: err.context,
            status,
            durationMs,
          },
          'API request failed with app error',
        );

        return NextResponse.json(
          { error: await safeMessage(err), code: err.code, requestId },
          { status, headers: { [REQUEST_ID_HEADER]: requestId } },
        );
      }

      // Unhandled unexpected error
      logger.error(
        {
          requestId,
          method: req.method,
          url: req.url,
          err,
          durationMs,
        },
        'API request failed with unhandled error',
      );

      return NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500, headers: { [REQUEST_ID_HEADER]: requestId } },
      );
    }
  };
}

/** Returns a user-safe, translated error message — never exposes internal details. */
async function safeMessage(err: AppError): Promise<string> {
  let t: Awaited<ReturnType<typeof getTranslations>>;
  try {
    t = await getTranslations();
  } catch {
    // Outside a Next.js request context (e.g. tests) — fall back to raw keys
    const fallback: Record<string, string> = {
      NOT_FOUND: err.message,
      VALIDATION_ERROR: err.message,
      INGESTION_ERROR: err.message,
      AUTH_ERROR: 'Authentication required',
      RATE_LIMIT_ERROR: 'Too many requests — please slow down',
      PLAN_LIMIT_ERROR: err.message,
      LLM_ERROR: 'Card generation failed — please try again',
      INTERNAL_ERROR: 'Internal server error',
    };
    return fallback[err.code] ?? 'Internal server error';
  }

  switch (err.code) {
    case 'NOT_FOUND':
    case 'VALIDATION_ERROR':
    case 'INGESTION_ERROR':
      // These carry specific user-facing messages crafted at the throw site
      return err.message;
    case 'AUTH_ERROR':
      return t('errors.authRequired');
    case 'RATE_LIMIT_ERROR':
      return t('errors.tooManyRequests');
    case 'PLAN_LIMIT_ERROR':
      // Message is crafted at the throw site and is already user-facing
      return err.message;
    case 'LLM_ERROR':
      return t('errors.generationFailed');
    case 'INTERNAL_ERROR':
    default:
      return t('errors.internalError');
  }
}
