import 'server-only';
import OpenAI from 'openai';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type LlmProviderId = 'qwen' | 'deepseek';

export interface LlmProviderConfig {
  id: LlmProviderId;
  apiKey: string;
  baseURL: string;
  model: string;
  /** Vendor-specific params to pass alongside chat completions */
  extraParams?: Record<string, unknown>;
}

// ─── Primary Provider Cache ──────────────────────────────────────────────────

interface CacheEntry {
  value: LlmProviderId;
  expiresAt: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 30_000; // 30 seconds

/**
 * Load primary provider from database.
 * Falls back to env.LLM_PROVIDER if not set in DB.
 */
export async function loadPrimaryProvider(): Promise<LlmProviderId> {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', 'llm_primary_provider')
      .single();

    if (error) {
      console.error('[LLM] Database query error:', error);
      throw error;
    }
    if (!data?.value) {
      console.warn('[LLM] No app_config entry found, using env fallback');
      throw new Error('No app_config entry for llm_primary_provider');
    }

    // JSON value is stored as string in JSONB, need to parse if string
    let providerId = data.value;
    if (typeof providerId === 'string' && providerId.startsWith('"')) {
      providerId = JSON.parse(providerId);
    }

    console.log('[LLM] Loaded primary provider from DB:', providerId);
    // Update cache
    cache = { value: providerId as LlmProviderId, expiresAt: Date.now() + CACHE_TTL_MS };
    return providerId as LlmProviderId;
  } catch (err) {
    console.log('[LLM] Falling back to env-based provider');
    // Fall through to env-based default
    return getPrimaryProviderId();
  }
}

/**
 * Save primary provider to database and update cache.
 */
export async function savePrimaryProvider(id: LlmProviderId): Promise<void> {
  console.log('[LLM] Saving provider to DB:', id);
  // Store as JSON-encoded string in JSONB field (same as migration)
  const jsonValue = JSON.stringify(id);

  const { error } = await supabaseAdmin
    .from('app_config')
    .upsert({ key: 'llm_primary_provider', value: jsonValue } as any, { onConflict: 'key' });

  if (error) {
    console.error('[LLM] Failed to save provider:', error);
    throw error;
  }

  console.log('[LLM] Successfully saved provider:', id);
  // Update cache immediately
  cache = { value: id, expiresAt: Date.now() + CACHE_TTL_MS };
}

export function getPrimaryProviderId(): LlmProviderId {
  // Check cache first (avoids DB hit in hot path)
  if (cache && cache.expiresAt > Date.now()) {
    return cache.value;
  }
  const p = env.LLM_PROVIDER;
  if (p === 'mock') return 'qwen'; // fallback for mock mode
  return p;
}

export function getFallbackProviderId(): LlmProviderId | null {
  const primary = getPrimaryProviderId();
  // Only fallback if both providers have API keys configured
  const alt: LlmProviderId = primary === 'qwen' ? 'deepseek' : 'qwen';
  const config = getProviderConfig(alt);
  return config ? alt : null;
}

export function getProviderConfig(id: LlmProviderId): LlmProviderConfig | null {
  switch (id) {
    case 'qwen':
      if (!env.QWEN_API_KEY) return null;
      return {
        id: 'qwen',
        apiKey: env.QWEN_API_KEY,
        baseURL: env.QWEN_BASE_URL ?? 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
        model: env.QWEN_MODEL,
        extraParams: { enable_thinking: false },
      };
    case 'deepseek':
      if (!env.DEEPSEEK_API_KEY) return null;
      return {
        id: 'deepseek',
        apiKey: env.DEEPSEEK_API_KEY,
        baseURL: env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
        model: env.DEEPSEEK_MODEL,
      };
    default:
      return null;
  }
}

export function createClient(config: LlmProviderConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}

// ─── Circuit breaker ─────────────────────────────────────────────────────────

interface CircuitState {
  failures: number;
  lastFailure: number;
  open: boolean;
}

const circuits = new Map<LlmProviderId, CircuitState>();

const FAILURE_THRESHOLD = 3;
const COOLDOWN_MS = 60_000; // 1 minute

export function recordFailure(id: LlmProviderId) {
  const state = circuits.get(id) ?? { failures: 0, lastFailure: 0, open: false };
  state.failures++;
  state.lastFailure = Date.now();
  if (state.failures >= FAILURE_THRESHOLD) {
    state.open = true;
  }
  circuits.set(id, state);
}

export function recordSuccess(id: LlmProviderId) {
  circuits.delete(id);
}

export function isCircuitOpen(id: LlmProviderId): boolean {
  const state = circuits.get(id);
  if (!state?.open) return false;
  // Auto-close after cooldown (half-open → allow retry)
  if (Date.now() - state.lastFailure > COOLDOWN_MS) {
    state.open = false;
    state.failures = 0;
    return false;
  }
  return true;
}

/** Returns whether an error is retriable (rate-limit / server error) */
export function isRetriableError(err: unknown): boolean {
  if (err instanceof OpenAI.APIError) {
    return err.status === 429 || err.status >= 500;
  }
  // Network timeouts
  if (err instanceof Error && err.message.includes('timeout')) return true;
  return false;
}
