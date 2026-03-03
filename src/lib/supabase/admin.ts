import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

/**
 * Privileged Supabase client using the service_role key.
 *
 * ⚠️  SERVER-ONLY — the `server-only` import at the top prevents this module
 * from ever being bundled into the client. It bypasses RLS everywhere.
 *
 * Use only in:
 *  - API Routes that need admin-level writes (card generation, source processing)
 *  - The local generator script (generator/generate_flashcards.js)
 */
export const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
