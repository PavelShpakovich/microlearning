import Anthropic from '@anthropic-ai/sdk';
import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import { buildPrompt } from '@/lib/llm/prompt';
import { parseLlmOutput } from '@/lib/llm/parse';
import type { LlmProviderAdapter } from '@/lib/llm/provider';
import type { CardsOutput, GenerateInput } from '@/lib/llm/schema';

export class AnthropicProvider implements LlmProviderAdapter {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    if (!env.ANTHROPIC_API_KEY) {
      throw new LlmError({
        message: 'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic',
      });
    }
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    this.model = env.ANTHROPIC_MODEL;
  }

  async generate(input: GenerateInput): Promise<CardsOutput> {
    const { system, user } = buildPrompt(input);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }],
    });

    const block = response.content[0];
    const raw = block?.type === 'text' ? block.text : '';
    return parseLlmOutput(raw);
  }
}
