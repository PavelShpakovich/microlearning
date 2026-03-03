'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/supabase/types';

// Read public vars directly — importing the full env.ts would pull server-only
// vars (SUPABASE_SERVICE_KEY etc.) into the client bundle and crash at runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Browser-side Supabase client.
 * Uses the public anon key only — never the service role key.
 * Import this only in Client Components.
 */
export function createSupabaseClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
