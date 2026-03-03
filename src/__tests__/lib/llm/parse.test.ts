import { parseLlmOutput } from '@/lib/llm/parse';
import { LlmError } from '@/lib/errors';

describe('parseLlmOutput', () => {
  it('parses a valid JSON array of cards', () => {
    const input = JSON.stringify([
      { question: 'What is TypeScript?', answer: 'A typed superset of JavaScript.' },
      { question: 'What is a generic?', answer: 'A reusable type parameter.' },
    ]);

    const result = parseLlmOutput(input);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      question: 'What is TypeScript?',
      answer: 'A typed superset of JavaScript.',
    });
  });

  it('throws LlmError for non-JSON output', () => {
    expect(() => parseLlmOutput('not json at all'))
      .toThrow(LlmError);
  });

  it('throws LlmError for an empty array', () => {
    expect(() => parseLlmOutput('[]'))
      .toThrow(LlmError);
  });

  it('throws LlmError when cards have empty question', () => {
    const input = JSON.stringify([{ question: '', answer: 'Some answer' }]);
    expect(() => parseLlmOutput(input)).toThrow(LlmError);
  });

  it('throws LlmError when cards have empty answer', () => {
    const input = JSON.stringify([{ question: 'Some question', answer: '' }]);
    expect(() => parseLlmOutput(input)).toThrow(LlmError);
  });

  it('throws LlmError when input is not an array', () => {
    const input = JSON.stringify({ question: 'Q', answer: 'A' });
    expect(() => parseLlmOutput(input)).toThrow(LlmError);
  });
});
