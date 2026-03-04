import { z } from 'zod';

/** A single microlearning info card as validated from LLM output. */
const normalizedCardSchema = z.object({
  title: z.string().trim().min(1, 'title is empty').max(100, 'title too long'),
  body: z.string().trim().min(20, 'body too short (≥20 chars)').max(5000, 'body too long'),
});

const legacyCardSchema = z
  .object({
    question: z.string().trim().min(1, 'question is empty').max(100, 'question too long'),
    answer: z.string().trim().min(20, 'answer too short (≥20 chars)').max(5000, 'answer too long'),
  })
  .transform((legacy) => ({
    title: legacy.question,
    body: legacy.answer,
  }));

export const cardOutputSchema = z.union([normalizedCardSchema, legacyCardSchema]);

/** The full array of cards the LLM must return. */
export const cardsOutputSchema = z.array(cardOutputSchema).min(1, 'LLM returned no cards');

export type CardOutput = z.infer<typeof cardOutputSchema>;
export type CardsOutput = z.infer<typeof cardsOutputSchema>;

/** Input to the LLM generate function. */
export interface GenerateInput {
  theme: string;
  /** Source text to base cards on. If omitted, the LLM generates from the theme alone. */
  sourceText?: string;
  count: number;
  /** Topics already covered in this theme — LLM should avoid these. */
  topicsToAvoid?: string[];
  /** Language for generated cards (en or ru). Defaults to 'en'. */
  language?: 'en' | 'ru';
}
