import { cardsOutputSchema, type CardsOutput } from '@/lib/llm/schema';
import { LlmError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * Parses and validates raw text from an LLM response into typed cards.
 * Throws LlmError if output is invalid JSON or fails schema validation.
 */
export function parseLlmOutput(raw: string): CardsOutput {
  logger.info({ rawLength: raw.length }, 'Parse: Starting parse');
  let text = raw.trim();

  // Strip markdown code fences (```json ... ``` or ``` ... ```)
  text = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  // Extract the first JSON array or object found anywhere in the text.
  // This handles reasoning/chain-of-thought models that narrate before outputting JSON.
  const arrayStart = text.indexOf('[');
  const objectStart = text.indexOf('{');

  // Determine which comes first
  let jsonStart = -1;
  let isArray = false;

  if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
    jsonStart = arrayStart;
    isArray = true;
  } else if (objectStart !== -1) {
    jsonStart = objectStart;
    isArray = false;
  }

  if (jsonStart !== -1) {
    // Find the matching closing bracket
    let bracketCount = 0;
    let endIdx = jsonStart;
    const openChar = isArray ? '[' : '{';
    const closeChar = isArray ? ']' : '}';

    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === openChar) bracketCount++;
      else if (text[i] === closeChar) bracketCount--;
      if (bracketCount === 0) {
        endIdx = i;
        break;
      }
    }

    text = text.slice(jsonStart, endIdx + 1);
  }

  logger.info({ textLength: text.length, snippet: text.slice(0, 100) }, 'Parse: Extracted JSON');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    logger.error({ snippet: text.slice(0, 200) }, 'Parse: JSON parse failed');
    throw new LlmError({
      message: 'LLM returned non-JSON output',
      context: { raw: raw.slice(0, 500) },
    });
  }

  logger.info(
    { type: typeof parsed, isArray: Array.isArray(parsed), isObject: typeof parsed === 'object' },
    'Parse: JSON parsed',
  );

  // Handle both direct array and object with "cards" field
  let cardsArray = parsed;
  if (
    typeof parsed === 'object' &&
    parsed !== null &&
    !Array.isArray(parsed) &&
    'cards' in parsed
  ) {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.cards)) {
      logger.info({}, 'Parse: Extracted cards array from wrapper object');
      cardsArray = obj.cards;
    }
  }

  const result = cardsOutputSchema.safeParse(cardsArray);
  if (!result.success) {
    logger.error(
      { errors: result.error.issues, raw: text.slice(0, 500) },
      'Parse: Schema validation failed',
    );
    throw new LlmError({
      message: 'LLM output failed schema validation',
      context: {
        errors: result.error.issues,
        raw: raw.slice(0, 500),
      },
    });
  }

  logger.info({ cardCount: result.data.length }, 'Parse: Success');
  return result.data;
}
