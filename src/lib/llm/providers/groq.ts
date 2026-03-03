import Groq from 'groq-sdk';
import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import { buildPrompt } from '@/lib/llm/prompt';
import { parseLlmOutput } from '@/lib/llm/parse';
import type { LlmProviderAdapter } from '@/lib/llm/provider';
import type { CardsOutput, GenerateInput } from '@/lib/llm/schema';

export class GroqProvider implements LlmProviderAdapter {
  private readonly client: Groq;
  private readonly model: string;

  constructor() {
    if (!env.GROQ_API_KEY) {
      throw new LlmError({ message: 'GROQ_API_KEY is required when LLM_PROVIDER=groq' });
    }
    this.client = new Groq({ apiKey: env.GROQ_API_KEY });
    this.model = env.GROQ_MODEL;
  }

  async generate(input: GenerateInput): Promise<CardsOutput> {
    const { system, user } = buildPrompt(input);

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const raw = response.choices[0]?.message.content ?? '';
    // Groq json_object mode wraps in an object — extract the array if needed
    const text = raw.trim().startsWith('[') ? raw : extractArrayFromObject(raw);
    return parseLlmOutput(text);
  }
}

function extractArrayFromObject(raw: string): string {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const arrayValue = Object.values(obj).find(Array.isArray);
    return arrayValue ? JSON.stringify(arrayValue) : raw;
  } catch {
    return raw;
  }
}
