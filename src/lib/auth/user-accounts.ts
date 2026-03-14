import { supabaseAdmin } from '@/lib/supabase/admin';

export function isTelegramStubEmail(email: string | null | undefined): boolean {
  return Boolean(email?.startsWith('telegram_') && email.includes('@noreply'));
}

export async function findAuthUserByEmail(
  email: string,
): Promise<{ id: string; email: string | null } | null> {
  let page = 1;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const match = users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      return { id: match.id, email: match.email ?? null };
    }

    if (users.length < 1000) {
      return null;
    }

    page += 1;
  }
}
