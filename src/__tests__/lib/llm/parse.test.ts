import { parseLlmOutput } from '@/lib/llm/parse';
import { LlmError } from '@/lib/errors';

describe('parseLlmOutput', () => {
  const longText = 'A'.repeat(101); // Meets the 100 char minimum

  it('parses legacy question/answer cards and normalizes output', () => {
    const input = JSON.stringify([
      {
        question: 'What is TypeScript?',
        answer: `TypeScript is a typed superset of JavaScript that compiles to plain JavaScript. ${longText}`,
      },
      {
        question: 'What is a generic?',
        answer: `Generics are a facility of generic programming that were added to the TypeScript. ${longText}`,
      },
    ]);

    const result = parseLlmOutput(input);

    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('What is TypeScript?');
    expect(result[0].body).toContain(longText);
  });

  it('parses title/body cards directly', () => {
    const input = JSON.stringify([
      {
        title: 'Type narrowing',
        body: `Type narrowing refines broad union types into specific safe branches by using type guards. ${longText}`,
      },
    ]);

    const result = parseLlmOutput(input);

    expect(result[0].title).toBe('Type narrowing');
    expect(result[0].body).toContain(longText);
  });

  it('promotes standalone pseudo-headings to markdown headings', () => {
    const input = JSON.stringify([
      {
        title: 'React hooks',
        body: `Ключевая концепция
Функциональные компоненты с хуками представляют собой современный подход к созданию компонентов в React. ${longText}

Как это работает
Хуки — это функции, которые позволяют подключаться к возможностям React из функциональных компонентов.

Ключевые механизмы:
useState: управляет локальным состоянием.
useEffect: обрабатывает побочные эффекты.

Почему это важно
Хуки упрощают архитектуру приложения и делают логику переиспользуемой.`,
      },
    ]);

    const result = parseLlmOutput(input);

    expect(result[0].body).toContain('## Ключевая концепция');
    expect(result[0].body).toContain('## Как это работает');
    expect(result[0].body).toContain('## Ключевые механизмы');
    expect(result[0].body).toContain('## Почему это важно');
  });

  it('throws LlmError for non-JSON output', () => {
    expect(() => parseLlmOutput('not json at all')).toThrow(LlmError);
  });

  it('throws LlmError for an empty array', () => {
    expect(() => parseLlmOutput('[]')).toThrow(LlmError);
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
