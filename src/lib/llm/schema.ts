import { z } from 'zod';

/** A single microlearning info card as validated from LLM output. */
export const cardOutputSchema = z.object({
  title: z.string().min(1, 'title is empty').max(100, 'title too long'), // ≤ 10 words
  body: z.string().min(50, 'body too short').max(5000, 'body too long'), // 5-10 sentences or more for depth
});

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
}
