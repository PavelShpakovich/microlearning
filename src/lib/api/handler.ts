import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
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
      const response = await handler(req);
      response.headers.set(REQUEST_ID_HEADER, requestId);

      logger.info({
        requestId,
        method: req.method,
        url: req.url,
        status: response.status,
        durationMs: Date.now() - start,
      });

      return response;
    } catch (err) {
      const durationMs = Date.now() - start;

      if (err instanceof AppError) {
        const status = httpStatusForError(err);

        logger.warn({
          requestId,
          method: req.method,
          url: req.url,
          errorCode: err.code,
          errorMessage: err.message,
          context: err.context,
          status,
          durationMs,
        });

        return NextResponse.json(
          { error: safeMessage(err), code: err.code, requestId },
          { status, headers: { [REQUEST_ID_HEADER]: requestId } },
        );
      }

      // Unhandled unexpected error
      logger.error({
        requestId,
        method: req.method,
        url: req.url,
        err,
        durationMs,
      });

      return NextResponse.json(
        { error: 'Internal server error', requestId },
        { status: 500, headers: { [REQUEST_ID_HEADER]: requestId } },
      );
    }
  };
}

/** Returns a user-safe error message — never exposes internal details. */
function safeMessage(err: AppError): string {
  switch (err.code) {
    case 'NOT_FOUND':
      return err.message;
    case 'VALIDATION_ERROR':
      return err.message;
    case 'AUTH_ERROR':
      return 'Authentication required';
    case 'RATE_LIMIT_ERROR':
      return 'Too many requests — please slow down';
    case 'LLM_ERROR':
      return 'Card generation failed — please try again';
    case 'INGESTION_ERROR':
      return 'Failed to process the provided source — please check the file or URL';
    case 'INTERNAL_ERROR':
    default:
      return 'Internal server error';
  }
}
