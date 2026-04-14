import { extractStructuredJson, parseStructuredJson } from '@/lib/llm/structured-output';
import { z } from 'zod';
import { LlmError } from '@/lib/errors';

// ── extractStructuredJson ────────────────────────────────────────────────────

describe('extractStructuredJson', () => {
  it('extracts a plain JSON object', () => {
    const raw = '{"title":"Test","value":42}';
    expect(extractStructuredJson(raw)).toBe(raw);
  });

  it('strips markdown code fences', () => {
    const raw = '```json\n{"key":"value"}\n```';
    const extracted = extractStructuredJson(raw);
    expect(JSON.parse(extracted)).toEqual({ key: 'value' });
  });

  it('strips code fences without language tag', () => {
    const raw = '```\n{"key":"value"}\n```';
    const extracted = extractStructuredJson(raw);
    expect(JSON.parse(extracted)).toEqual({ key: 'value' });
  });

  it('extracts JSON embedded in surrounding text', () => {
    const raw = 'Here is the result: {"title":"Hello"} — done.';
    const extracted = extractStructuredJson(raw);
    expect(JSON.parse(extracted)).toEqual({ title: 'Hello' });
  });

  it('extracts a JSON array', () => {
    const raw = '[1, 2, 3]';
    expect(JSON.parse(extractStructuredJson(raw))).toEqual([1, 2, 3]);
  });

  it('handles deeply-nested JSON', () => {
    const raw = '{"a":{"b":{"c":42}}}';
    expect(JSON.parse(extractStructuredJson(raw))).toEqual({ a: { b: { c: 42 } } });
  });

  it('prefers object over array when object starts first', () => {
    const raw = ' {"x":1} [1,2,3] ';
    const result = extractStructuredJson(raw);
    expect(JSON.parse(result)).toEqual({ x: 1 });
  });

  it('returns text as-is when no JSON structure found', () => {
    const raw = 'no json here';
    expect(extractStructuredJson(raw)).toBe('no json here');
  });
});

// ── parseStructuredJson ──────────────────────────────────────────────────────

const SimpleSchema = z.object({
  title: z.string(),
  count: z.number(),
});

describe('parseStructuredJson', () => {
  it('parses a valid JSON object against a schema', () => {
    const raw = '{"title":"Hello","count":5}';
    const result = parseStructuredJson(raw, SimpleSchema);
    expect(result).toEqual({ title: 'Hello', count: 5 });
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const raw = '```json\n{"title":"World","count":0}\n```';
    const result = parseStructuredJson(raw, SimpleSchema);
    expect(result).toEqual({ title: 'World', count: 0 });
  });

  it('throws LlmError when JSON is invalid', () => {
    expect(() => parseStructuredJson('not json', SimpleSchema)).toThrow(LlmError);
  });

  it('throws LlmError when JSON does not match schema', () => {
    // count is a string, should be number
    const raw = '{"title":"Hi","count":"wrong"}';
    expect(() => parseStructuredJson(raw, SimpleSchema)).toThrow(LlmError);
  });

  it('throws LlmError when required field is missing', () => {
    const raw = '{"title":"Hi"}'; // missing count
    expect(() => parseStructuredJson(raw, SimpleSchema)).toThrow(LlmError);
  });

  it('error message mentions "JSON" for parse failures', () => {
    try {
      parseStructuredJson('not json', SimpleSchema);
    } catch (err) {
      expect(err).toBeInstanceOf(LlmError);
      expect((err as LlmError).message).toMatch(/JSON/i);
    }
  });
});
