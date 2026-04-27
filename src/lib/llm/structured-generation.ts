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
  maxTokens?: number;
  temperature?: number;
}

export interface StructuredGenerationResult<T> {
  content: T;
  usageTokens: number | null;
}

export async function generateStructuredOutput<T>(
  request: StructuredGenerationRequest<T>,
): Promise<T> {
  const result = await generateStructuredOutputWithUsage(request);
  return result.content;
}

export async function generateStructuredOutputWithUsage<T>(
  request: StructuredGenerationRequest<T>,
): Promise<StructuredGenerationResult<T>> {
  if (env.LLM_PROVIDER === 'mock') {
    return {
      content: request.mockResponse,
      usageTokens: null,
    };
  }

  const result = await generateStructuredText(
    request.systemPrompt,
    request.userPrompt,
    request.maxTokens,
    request.temperature,
  );
  return {
    content: parseStructuredJson(result.text, request.schema),
    usageTokens: result.usageTokens,
  };
}

async function generateStructuredText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens?: number,
  temperature?: number,
): Promise<{ text: string; usageTokens: number | null }> {
  switch (env.LLM_PROVIDER) {
    case 'qwen':
      return generateWithQwen(systemPrompt, userPrompt, maxTokens, temperature);
    default:
      throw new LlmError({
        message: `Unsupported LLM_PROVIDER: ${String(env.LLM_PROVIDER)}`,
      });
  }
}

async function generateWithQwen(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
  temperature = 0.4,
): Promise<{ text: string; usageTokens: number | null }> {
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
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    // @ts-expect-error QWEN-specific flag not in SDK types yet.
    enable_thinking: false,
  });

  const choice = response.choices[0];
  if (choice?.finish_reason === 'length') {
    throw new LlmError({
      message: 'LLM response was truncated (hit max_tokens limit)',
      context: { model: env.QWEN_MODEL, usageTokens: response.usage?.total_tokens },
    });
  }

  return {
    text: choice?.message.content ?? '',
    usageTokens: response.usage?.total_tokens ?? null,
  };
}

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export type ChatOnComplete = (fullText: string, tokensUsed?: number) => Promise<void>;

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

/**
 * Streaming multi-turn chat. Returns a ReadableStream of text chunks.
 * The full accumulated text and total token usage are passed to `onComplete`
 * when the stream ends. `tokensUsed` is undefined when the provider doesn't
 * report usage (e.g. mock mode or if the API doesn't support stream_options).
 */
export function streamChatResponse(
  messages: ChatMessage[],
  onComplete: ChatOnComplete,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  if (env.LLM_PROVIDER === 'mock') {
    const text =
      'Это тестовый ответ ассистента. В рабочем режиме здесь был бы развёрнутый ответ на ваш вопрос по разбору.';
    return new ReadableStream({
      start(controller) {
        const words = text.split(' ');
        let i = 0;
        const tick = () => {
          if (i >= words.length) {
            controller.close();
            void onComplete(text, undefined);
            return;
          }
          controller.enqueue(encoder.encode((i > 0 ? ' ' : '') + words[i]));
          i++;
          setTimeout(tick, 30);
        };
        tick();
      },
    });
  }

  if (!env.QWEN_API_KEY) {
    return new ReadableStream({
      start(controller) {
        controller.error(new LlmError({ message: 'QWEN_API_KEY is required' }));
      },
    });
  }

  const client = new OpenAI({
    apiKey: env.QWEN_API_KEY,
    baseURL: env.QWEN_BASE_URL,
  });

  let fullContent = '';
  let tokensUsed: number | undefined;

  return new ReadableStream({
    async start(controller) {
      try {
        // @ts-expect-error Qwen platform extends OpenAI streaming API with vendor-specific params.
        const stream = await client.chat.completions.create({
          model: env.QWEN_MODEL,
          messages,
          temperature: 0.7,
          stream: true,
          stream_options: { include_usage: true },
          enable_thinking: false,
        });

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta.content ?? '';
          if (text) {
            fullContent += text;
            controller.enqueue(encoder.encode(text));
          }
          // Final chunk carries usage data when stream_options.include_usage is true
          if (chunk.usage?.total_tokens) {
            tokensUsed = chunk.usage.total_tokens;
          }
        }

        controller.close();
        await onComplete(fullContent, tokensUsed);
      } catch (err) {
        // Save partial response so it's not lost on disconnect/error
        if (fullContent) {
          try {
            await onComplete(fullContent, tokensUsed);
          } catch {
            /* best-effort save */
          }
        }
        try {
          controller.error(err);
        } catch {
          /* stream already closed/errored */
        }
      }
    },
  });
}
