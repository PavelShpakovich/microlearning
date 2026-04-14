import OpenAI from 'openai';
import type { ZodType } from 'zod';
import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import { parseStructuredJson } from '@/lib/llm/structured-output';

interface StructuredGenerationRequest<T> {
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  mockResponse: T;
}

export async function generateStructuredOutput<T>(
  request: StructuredGenerationRequest<T>,
): Promise<T> {
  if (env.LLM_PROVIDER === 'mock') {
    return request.mockResponse;
  }

  const raw = await generateStructuredText(request.systemPrompt, request.userPrompt);
  return parseStructuredJson(raw, request.schema);
}

async function generateStructuredText(systemPrompt: string, userPrompt: string): Promise<string> {
  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return generateWithQwen(systemPrompt, userPrompt);
    default:
      throw new LlmError({
        message: `Unsupported LLM_PROVIDER: ${String(env.LLM_PROVIDER)}`,
      });
  }
}

async function generateWithQwen(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!env.QWEN_API_KEY) {
    throw new LlmError({ message: 'QWEN_API_KEY is required when LLM_PROVIDER=qwen' });
  }

  const client = new OpenAI({
    apiKey: env.QWEN_API_KEY,
    baseURL: env.QWEN_BASE_URL,
  });

  const response = await client.chat.completions.create({
    model: env.QWEN_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.6,
    // @ts-expect-error QWEN-specific flag not in SDK types yet.
    enable_thinking: false,
  });

  return response.choices[0]?.message.content ?? '';
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/**
 * Multi-turn chat completion. Used for follow-up questions on a reading.
 * Returns plain text (no structured JSON parsing).
 */
export async function generateChatResponse(messages: ChatMessage[]): Promise<string> {
  if (env.LLM_PROVIDER === 'mock') {
    return 'Это тестовый ответ ассистента. В рабочем режиме здесь был бы развёрнутый ответ на ваш вопрос по разбору.';
  }

  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return generateChatWithQwen(messages);
    default:
      throw new LlmError({
        message: `Unsupported LLM_PROVIDER: ${String(env.LLM_PROVIDER)}`,
      });
  }
}

async function generateChatWithQwen(messages: ChatMessage[]): Promise<string> {
  if (!env.QWEN_API_KEY) {
    throw new LlmError({ message: 'QWEN_API_KEY is required when LLM_PROVIDER=qwen' });
  }

  const client = new OpenAI({
    apiKey: env.QWEN_API_KEY,
    baseURL: env.QWEN_BASE_URL,
  });

  const response = await client.chat.completions.create({
    model: env.QWEN_MODEL,
    messages,
    temperature: 0.7,
    // @ts-expect-error QWEN-specific flag not in SDK types yet.
    enable_thinking: false,
  });

  return response.choices[0]?.message.content ?? '';
}
