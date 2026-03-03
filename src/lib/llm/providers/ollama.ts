import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import { buildPrompt } from '@/lib/llm/prompt';
import { parseLlmOutput } from '@/lib/llm/parse';
import { logger } from '@/lib/logger';
import type { LlmProviderAdapter } from '@/lib/llm/provider';
import type { CardsOutput, GenerateInput } from '@/lib/llm/schema';

interface OllamaChatResponse {
  message: { role: string; content: string };
  done: boolean;
}

export class OllamaProvider implements LlmProviderAdapter {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor() {
    if (!env.OLLAMA_BASE_URL) {
      throw new LlmError({ message: 'OLLAMA_BASE_URL is required when LLM_PROVIDER=ollama' });
    }
    this.baseUrl = env.OLLAMA_BASE_URL;
    this.model = env.OLLAMA_MODEL;
  }

  async generate(input: GenerateInput): Promise<CardsOutput> {
    const { system, user } = buildPrompt(input);

    logger.info(
      { model: this.model, url: this.baseUrl, count: input.count },
      'Ollama: Starting request',
    );

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2-minute timeout

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          format: 'json',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
            // Seed the assistant turn with `[` to help guide format, but the model
            // may still return wrapped format. The parser will handle both.
            { role: 'assistant', content: '[' },
          ],
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        logger.error({ status: res.status, statusText: res.statusText }, 'Ollama: Request failed');
        throw new LlmError({
          message: `Ollama request failed: ${res.status} ${res.statusText}`,
          context: { status: res.status },
        });
      }

      const data = (await res.json()) as OllamaChatResponse;
      logger.info({ contentLength: data.message.content.length }, 'Ollama: Got response');

      // The response is the array/object continuation. If we seeded with `[`,
      // we need to prepend it. But if the model returned a wrapped object,
      // the parser will handle it.
      const raw = data.message.content.trim().startsWith('[')
        ? data.message.content
        : '[' + data.message.content;

      logger.info({ rawLength: raw.length }, 'Ollama: Parsing output');

      const result = parseLlmOutput(raw);
      logger.info({ cardCount: result.length }, 'Ollama: Parsed successfully');
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
