import {
  AppError,
  NotFoundError,
  ValidationError,
  LlmError,
  AuthError,
  RateLimitError,
  httpStatusForError,
  tryCatch,
} from '@/lib/errors';

describe('AppError subclasses', () => {
  it('NotFoundError has correct code and maps to 404', () => {
    const err = new NotFoundError({ message: 'Card not found' });
    expect(err.code).toBe('NOT_FOUND');
    expect(httpStatusForError(err)).toBe(404);
    expect(err.message).toBe('Card not found');
  });

  it('ValidationError maps to 422', () => {
    const err = new ValidationError({ message: 'Invalid input' });
    expect(httpStatusForError(err)).toBe(422);
  });

  it('LlmError maps to 500', () => {
    const err = new LlmError({ message: 'LLM failed' });
    expect(httpStatusForError(err)).toBe(500);
  });

  it('AuthError maps to 401', () => {
    const err = new AuthError({ message: 'Unauthorized' });
    expect(httpStatusForError(err)).toBe(401);
  });

  it('RateLimitError maps to 429', () => {
    const err = new RateLimitError({ message: 'Slow down' });
    expect(httpStatusForError(err)).toBe(429);
  });

  it('preserves context', () => {
    const err = new ValidationError({ message: 'Bad', context: { field: 'email' } });
    expect(err.context).toEqual({ field: 'email' });
  });
});

describe('tryCatch', () => {
  it('returns ok:true with data on success', async () => {
    const result = await tryCatch(async () => 42);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toBe(42);
  });

  it('returns ok:false with AppError when AppError is thrown', async () => {
    const result = await tryCatch(async () => {
      throw new NotFoundError({ message: 'not found' });
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(NotFoundError);
      expect(result.error.code).toBe('NOT_FOUND');
    }
  });

  it('wraps unknown errors as INTERNAL_ERROR', async () => {
    const result = await tryCatch(async () => {
      throw new Error('something unexpected');
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('INTERNAL_ERROR');
  });
});
