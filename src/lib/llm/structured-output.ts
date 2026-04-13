import type { ZodType } from 'zod';
import { LlmError } from '@/lib/errors';

export function extractStructuredJson(raw: string): string {
  let text = raw.trim();

  text = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const objectStart = text.indexOf('{');
  const arrayStart = text.indexOf('[');

  let jsonStart = -1;
  let openChar = '{';
  let closeChar = '}';

  if (objectStart !== -1 && (arrayStart === -1 || objectStart < arrayStart)) {
    jsonStart = objectStart;
  } else if (arrayStart !== -1) {
    jsonStart = arrayStart;
    openChar = '[';
    closeChar = ']';
  }

  if (jsonStart === -1) {
    return text;
  }

  let depth = 0;
  let endIndex = jsonStart;

  for (let index = jsonStart; index < text.length; index += 1) {
    if (text[index] === openChar) depth += 1;
    if (text[index] === closeChar) depth -= 1;
    if (depth === 0) {
      endIndex = index;
      break;
    }
  }

  return text.slice(jsonStart, endIndex + 1);
}

export function parseStructuredJson<T>(raw: string, schema: ZodType<T>): T {
  const text = extractStructuredJson(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new LlmError({
      message: 'LLM returned invalid JSON output',
      context: { raw: raw.slice(0, 1000) },
    });
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new LlmError({
      message: 'LLM output failed schema validation',
      context: {
        errors: result.error.issues,
        raw: raw.slice(0, 1000),
      },
    });
  }

  return result.data;
}
