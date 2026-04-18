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
  let inString = false;
  let escaped = false;

  for (let index = jsonStart; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === openChar) depth += 1;
    if (char === closeChar) depth -= 1;
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
    // Attempt to fix common LLM key-name errors before failing.
    // If every failed field is a prefix/substring mismatch with an extra key
    // in the parsed object, remap and re-validate once.
    const fixed = tryFixKeyNames(parsed, result.error.issues);
    if (fixed) {
      const retry = schema.safeParse(fixed);
      if (retry.success) return retry.data;
    }

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

/**
 * When Zod reports missing keys, check if the parsed object has a key that's
 * a prefix of the expected key (e.g. "interpret" → "interpretation").
 * Returns a shallow-copied object with remapped keys, or null if no fix applies.
 */
function tryFixKeyNames(
  parsed: unknown,
  issues: Array<{ code: string; path: PropertyKey[] }>,
): Record<string, unknown> | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

  const obj = parsed as Record<string, unknown>;
  const objKeys = Object.keys(obj);
  const copy = { ...obj };
  let anyFixed = false;

  for (const issue of issues) {
    if (issue.code !== 'invalid_type' || issue.path.length !== 1) continue;
    const expected = issue.path[0];
    if (typeof expected !== 'string' || expected in copy) continue;

    // Find a key that's a prefix of the expected key
    const match = objKeys.find((k) => k !== expected && expected.startsWith(k));
    if (!match) continue;

    copy[expected] = copy[match];
    anyFixed = true;
  }

  return anyFixed ? copy : null;
}
