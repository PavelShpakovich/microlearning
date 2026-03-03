import type { LlmProviderAdapter } from '@/lib/llm/provider';
import type { CardsOutput, GenerateInput } from '@/lib/llm/schema';

/**
 * Deterministic mock provider for use in tests.
 * Returns predictable cards without any network or API calls.
 */
export class MockProvider implements LlmProviderAdapter {
  async generate(input: GenerateInput): Promise<CardsOutput> {
    return Array.from({ length: input.count }, (_, i) => ({
      title: `Concept ${i + 1}: ${input.theme}`,
      body:
        `This is a comprehensive explanation for card ${i + 1} about ${input.theme}. ` +
        `It covers the key aspects of this concept in detail, explaining what it is, how it works, ` +
        `and why it matters in the context of ${input.theme}. The explanation includes examples and context ` +
        `to help users understand the material deeply and apply it in practical situations.`,
    }));
  }
}
