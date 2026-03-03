import type { CardsOutput, GenerateInput } from '@/lib/llm/schema';

/** Contract every LLM provider must implement. */
export interface LlmProviderAdapter {
  generate(input: GenerateInput): Promise<CardsOutput>;
}
