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
  } catch {
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
  if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.cards)) {
      // { cards: [...] } wrapper
      logger.info({}, 'Parse: Extracted cards array from wrapper object');
      cardsArray = obj.cards;
    } else if ('title' in obj || 'question' in obj) {
      // Single card object — wrap it in an array
      logger.info({}, 'Parse: Wrapping single card object in array');
      cardsArray = [parsed];
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
  return result.data.map((card) => ({ ...card, body: normalizeMarkdown(card.body) }));
}

/**
 * Normalizes common markdown rendering issues from LLM output:
 * - Ensures a blank line before bullet/numbered list items (fixes broken list rendering)
 * - Collapses 3+ consecutive blank lines to 2
 * - Strips an accidental leading ## heading that duplicates the card's purpose
 */
function normalizeMarkdown(body: string): string {
  return (
    body
      // Normalize heading markers like ##Heading -> ## Heading
      .replace(/^(#{2,6})([^#\s])/gm, '$1 $2')
      // Ensure a blank line before headings when attached to paragraph text
      .replace(/([^\n])\n(#{2,6}\s)/g, '$1\n\n$2')
      // Ensure a blank line after headings before following text
      .replace(/(#{2,6}\s[^\n]+)\n([^\n#\-*\d>])/g, '$1\n\n$2')
      // Ensure blank line before any list item not already preceded by a blank line
      .replace(/([^\n])\n([ \t]*[-*+][ \t]|[ \t]*\d+\.[ \t])/g, '$1\n\n$2')
      // Collapse 3+ consecutive blank lines to 2
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

export function extractArrayFromObject(raw: string): string {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const arrayValue = Object.values(obj).find(Array.isArray);
    return arrayValue ? JSON.stringify(arrayValue) : raw;
  } catch {
    return raw;
  }
}
