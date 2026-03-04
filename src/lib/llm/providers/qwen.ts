import OpenAI from 'openai';
import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import { buildPrompt } from '@/lib/llm/prompt';
import { parseLlmOutput, extractArrayFromObject } from '@/lib/llm/parse';
import { logger } from '@/lib/logger';
import type { LlmProviderAdapter } from '@/lib/llm/provider';
import type { CardsOutput, GenerateInput } from '@/lib/llm/schema';

/**
 * QWEN LLM Provider
 * Uses Alibaba Cloud's QWEN via the OpenAI-compatible API + OpenAI SDK.
 * API Docs: https://www.alibabacloud.com/help/en/model-studio/qwen-api-reference/
 *
 * Regional base URLs (set via QWEN_BASE_URL):
 * - Beijing (default): https://dashscope.aliyuncs.com/compatible-mode/v1
 * - Singapore:         https://dashscope-intl.aliyuncs.com/compatible-mode/v1
 * - US (Virginia):     https://dashscope-us.aliyuncs.com/compatible-mode/v1
 */
export class QwenProvider implements LlmProviderAdapter {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    if (!env.QWEN_API_KEY) {
      throw new LlmError({ message: 'QWEN_API_KEY is required when LLM_PROVIDER=qwen' });
    }
    this.model = env.QWEN_MODEL;
    this.client = new OpenAI({
      apiKey: env.QWEN_API_KEY,
      baseURL: env.QWEN_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
  }

  async generate(input: GenerateInput): Promise<CardsOutput> {
    const { system, user } = buildPrompt(input);

    logger.info({ model: this.model, count: input.count }, 'QWEN: Starting request');

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
    });

    const raw = response.choices[0]?.message.content ?? '';
    if (!raw) {
      throw new LlmError({ message: 'QWEN returned empty response' });
    }

    logger.info({ contentLength: raw.length }, 'QWEN: Got response');

    const text = raw.trim().startsWith('[') ? raw : extractArrayFromObject(raw);
    const result = parseLlmOutput(text);
    logger.info({ cardCount: result.length }, 'QWEN: Parsed successfully');
    return result;
  }
}
