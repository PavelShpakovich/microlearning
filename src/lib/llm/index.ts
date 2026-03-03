import { env } from '@/lib/env';
import { LlmError } from '@/lib/errors';
import type { LlmProviderAdapter } from '@/lib/llm/provider';
import type { CardsOutput, GenerateInput } from '@/lib/llm/schema';

// ─── Public re-exports (barrel) ───────────────────────────────────────────────
export type { GenerateInput, CardsOutput, CardOutput } from '@/lib/llm/schema';
export type { LlmProviderAdapter } from '@/lib/llm/provider';

// ─── Lazy provider factory ────────────────────────────────────────────────────

let _provider: LlmProviderAdapter | null = null;

/**
 * Returns the singleton LLM provider determined by the LLM_PROVIDER env var.
 * Providers are lazy-loaded so unused SDKs don't slow down cold starts.
 */
async function getProvider(): Promise<LlmProviderAdapter> {
  if (_provider) return _provider;

  switch (env.LLM_PROVIDER) {
    case 'groq': {
      const { GroqProvider } = await import('@/lib/llm/providers/groq');
      _provider = new GroqProvider();
      break;
    }
    case 'openai': {
      const { OpenAiProvider } = await import('@/lib/llm/providers/openai');
      _provider = new OpenAiProvider();
      break;
    }
    case 'anthropic': {
      const { AnthropicProvider } = await import('@/lib/llm/providers/anthropic');
      _provider = new AnthropicProvider();
      break;
    }
    case 'ollama': {
      const { OllamaProvider } = await import('@/lib/llm/providers/ollama');
      _provider = new OllamaProvider();
      break;
    }
    case 'mock': {
      const { MockProvider } = await import('@/lib/llm/providers/mock');
      _provider = new MockProvider();
      break;
    }
    default: {
      throw new LlmError({ message: `Unknown LLM_PROVIDER: ${String(env.LLM_PROVIDER)}` });
    }
  }

  return _provider;
}

/**
 * Primary public API for card generation.
 * Swap the LLM provider by changing the LLM_PROVIDER environment variable —
 * no code changes required.
 */
export async function generateCards(input: GenerateInput): Promise<CardsOutput> {
  const provider = await getProvider();
  return provider.generate(input);
}
