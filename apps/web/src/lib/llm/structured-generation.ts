import OpenAI from 'openai';
import type { ZodType } from 'zod';
import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import { parseStructuredJson } from '@/lib/llm/structured-output';
import {
  type LlmProviderConfig,
  getPrimaryProviderId,
  getFallbackProviderId,
  getProviderConfig,
  createClient,
  recordFailure,
  recordSuccess,
  isCircuitOpen,
  isRetriableError,
} from '@/lib/llm/provider';

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
  try {
    return {
      content: parseStructuredJson(result.text, request.schema),
      usageTokens: result.usageTokens,
    };
  } catch {
    // Retry once on validation failure — LLM occasionally produces
    // output that doesn't meet structural requirements (e.g. single paragraph).
    const retry = await generateStructuredText(
      request.systemPrompt,
      request.userPrompt,
      request.maxTokens,
      request.temperature,
    );
    return {
      content: parseStructuredJson(retry.text, request.schema),
      usageTokens: retry.usageTokens,
    };
  }
}

async function generateStructuredText(
  systemPrompt: string,
  userPrompt: string,
  maxTokens?: number,
  temperature?: number,
): Promise<{ text: string; usageTokens: number | null; model: string }> {
  const primaryId = getPrimaryProviderId();
  const fallbackId = getFallbackProviderId();

  // If primary circuit is open and fallback is available, go directly to fallback
  if (isCircuitOpen(primaryId) && fallbackId) {
    const fallbackConfig = getProviderConfig(fallbackId);
    if (fallbackConfig) {
      return callProvider(fallbackConfig, systemPrompt, userPrompt, maxTokens, temperature);
    }
  }

  const primaryConfig = getProviderConfig(primaryId);
  if (!primaryConfig) {
    throw new LlmError({
      message: `LLM provider "${primaryId}" is not configured (missing API key)`,
    });
  }

  try {
    const result = await callProvider(
      primaryConfig,
      systemPrompt,
      userPrompt,
      maxTokens,
      temperature,
    );
    recordSuccess(primaryId);
    return result;
  } catch (err) {
    // If retriable and fallback available, try fallback
    if (isRetriableError(err) && fallbackId) {
      recordFailure(primaryId);
      const fallbackConfig = getProviderConfig(fallbackId);
      if (fallbackConfig) {
        try {
          const result = await callProvider(
            fallbackConfig,
            systemPrompt,
            userPrompt,
            maxTokens,
            temperature,
          );
          recordSuccess(fallbackId);
          return result;
        } catch (fallbackErr) {
          recordFailure(fallbackId);
          throw fallbackErr;
        }
      }
    }
    throw err;
  }
}

async function callProvider(
  config: LlmProviderConfig,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
  temperature = 0.4,
): Promise<{ text: string; usageTokens: number | null; model: string }> {
  const client = createClient(config);

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
    ...config.extraParams,
  } as OpenAI.ChatCompletionCreateParamsNonStreaming);

  const choice = response.choices[0];
  if (choice?.finish_reason === 'length') {
    throw new LlmError({
      message: 'LLM response was truncated (hit max_tokens limit)',
      context: { model: config.model, usageTokens: response.usage?.total_tokens },
    });
  }

  return {
    text: choice?.message.content ?? '',
    usageTokens: response.usage?.total_tokens ?? null,
    model: config.model,
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

  const primaryId = getPrimaryProviderId();
  const fallbackId = getFallbackProviderId();

  if (isCircuitOpen(primaryId) && fallbackId) {
    const fallbackConfig = getProviderConfig(fallbackId);
    if (fallbackConfig) return chatWithProvider(fallbackConfig, messages);
  }

  const primaryConfig = getProviderConfig(primaryId);
  if (!primaryConfig) {
    throw new LlmError({ message: `LLM provider "${primaryId}" is not configured` });
  }

  try {
    const result = await chatWithProvider(primaryConfig, messages);
    recordSuccess(primaryId);
    return result;
  } catch (err) {
    if (isRetriableError(err) && fallbackId) {
      recordFailure(primaryId);
      const fallbackConfig = getProviderConfig(fallbackId);
      if (fallbackConfig) {
        try {
          const result = await chatWithProvider(fallbackConfig, messages);
          recordSuccess(fallbackId);
          return result;
        } catch (fbErr) {
          recordFailure(fallbackId);
          throw fbErr;
        }
      }
    }
    throw err;
  }
}

async function chatWithProvider(
  config: LlmProviderConfig,
  messages: ChatMessage[],
): Promise<string> {
  const client = createClient(config);

  const response = await client.chat.completions.create({
    model: config.model,
    messages,
    temperature: 0.7,
    ...config.extraParams,
  } as OpenAI.ChatCompletionCreateParamsNonStreaming);

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

  const primaryId = getPrimaryProviderId();
  const fallbackId = getFallbackProviderId();

  // Pick provider (respect circuit breaker)
  let providerId = primaryId;
  if (isCircuitOpen(primaryId) && fallbackId) {
    providerId = fallbackId;
  }

  const config = getProviderConfig(providerId);
  if (!config) {
    return new ReadableStream({
      start(controller) {
        controller.error(
          new LlmError({ message: `LLM provider "${providerId}" is not configured` }),
        );
      },
    });
  }

  const client = createClient(config);
  let fullContent = '';
  let tokensUsed: number | undefined;

  return new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.chat.completions.create({
          model: config.model,
          messages,
          temperature: 0.7,
          stream: true,
          stream_options: { include_usage: true },
          ...config.extraParams,
        } as OpenAI.ChatCompletionCreateParamsStreaming);

        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta.content ?? '';
          if (text) {
            fullContent += text;
            controller.enqueue(encoder.encode(text));
          }
          if (chunk.usage?.total_tokens) {
            tokensUsed = chunk.usage.total_tokens;
          }
        }

        recordSuccess(providerId);
        controller.close();
        await onComplete(fullContent, tokensUsed);
      } catch (err) {
        // On retriable error, try fallback (non-streaming for simplicity)
        if (isRetriableError(err) && fallbackId && providerId !== fallbackId) {
          recordFailure(providerId);
          const fbConfig = getProviderConfig(fallbackId);
          if (fbConfig) {
            try {
              const result = await chatWithProvider(fbConfig, messages);
              recordSuccess(fallbackId);
              controller.enqueue(encoder.encode(result));
              controller.close();
              await onComplete(result, undefined);
              return;
            } catch (fbErr) {
              recordFailure(fallbackId);
            }
          }
        }

        // Save partial response
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
