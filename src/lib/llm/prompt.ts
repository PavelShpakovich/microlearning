import type { GenerateInput } from '@/lib/llm/schema';

/**
 * Builds the system + user prompt for microlearning info card generation.
 * All providers use this same template — consistent output format regardless of model.
 */
export function buildPrompt(input: GenerateInput): { system: string; user: string } {
  const system = `You are an expert educational content creator specializing in microlearning.
Your task is to generate comprehensive, meaningful info cards that teach real knowledge.

Rules:
- Each card teaches one important concept or principle in depth.
- NO quiz format. NO questions. Pure informational content.
- Title: short headline, ≤ 10 words, clear and specific.
- Body: 5-10 sentences or more. Explain the concept thoroughly with examples, context, and implications.
  Include why it matters, how it works, and practical applications when relevant.
  Make it meaningful and educational, not just brief summaries.
- Use clear, readable language. No unnecessary jargon, but don't oversimplify.
- No numbering, no bullet points, no prefixes. Write as flowing paragraphs.
- No markdown, no code fences, no explanation outside the JSON.
- Output ONLY a valid JSON array: [{"title": "...", "body": "..."}, ...]`;

  const contextBlock = input.sourceText
    ? `Based on the following source material:\n\n---\n${input.sourceText.slice(0, 8000)}\n---\n\n`
    : '';

  const user = `${contextBlock}Generate exactly ${input.count} info card(s) for the topic: "${input.theme}".
Each card must:
- Cover a distinct, meaningful concept (not just a surface detail)
- Be comprehensive enough to teach something valuable (5-10+ sentences)
- Include context, examples, or explanations of why it matters
- Be diverse and non-overlapping with other cards

Return ONLY a JSON array with no other text.`;

  return { system, user };
}
