import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { decode as nextAuthJwtDecode, encode as nextAuthJwtEncode } from 'next-auth/jwt';
import { createHmac } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';
import { ensureSupabaseIdentityLink } from '@/lib/auth/account-identities';
import { env } from '@/lib/env';
import { createSupabaseAuthClient } from '@/lib/supabase/auth-client';
import { isTelegramStubEmail } from '@/lib/auth/user-accounts';

declare module 'next-auth' {
  interface User {
    id: string;
    isAdmin?: boolean;
    isStub?: boolean;
  }
  interface Session {
    user: User & {
      id: string;
      isAdmin?: boolean;
      isStub?: boolean;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    displayName?: string;
    email?: string;
    isAdmin?: boolean;
    isStub?: boolean;
  }
}

const nextAuthSecret = env.NEXTAUTH_SECRET;

// In Telegram Web (web.telegram.org) the Mini App runs inside an iframe.
// SameSite=Lax cookies are not sent on cross-site iframe navigations, so
// getToken() in middleware never finds the session → infinite spinner loop.
// SameSite=None; Secure allows the cookie in iframe contexts (cross-site).
const isProduction = process.env.NODE_ENV === 'production';

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
  cookies: {
    sessionToken: {
      name: `${isProduction ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: isProduction ? ('none' as const) : ('lax' as const),
        path: '/',
        secure: isProduction,
      },
    },
  },
  jwt: {
    async encode(params) {
      return nextAuthJwtEncode(params);
    },
    async decode(params) {
      try {
        return await nextAuthJwtDecode(params);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const isJwtDecryptError =
          message.includes('decryption operation failed') ||
          message.includes('JWEDecryptionFailed');

        if (isJwtDecryptError) {
          return null;
        }

        throw error;
      }
    },
  },
  providers: [
    Credentials({
      id: 'password',
      name: 'Email and Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;

        if (!email || !password) {
          throw new Error('Email and password are required');
        }

        const authClient = createSupabaseAuthClient();
        const { data, error } = await authClient.auth.signInWithPassword({ email, password });

        if (error || !data.user) {
          return null;
        }

        await ensureSupabaseIdentityLink(data.user.id, data.user.email ?? email);

        const fallbackDisplayName = deriveDisplayNameFromEmail(data.user.email ?? email);
        let { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('display_name, is_admin')
          .eq('id', data.user.id)
          .maybeSingle<{ display_name: string | null; is_admin: boolean | null }>();

        if (!profile) {
          const { data: createdProfile } = await supabaseAdmin
            .from('profiles')
            .upsert(
              {
                id: data.user.id,
                display_name: fallbackDisplayName,
              },
              { onConflict: 'id' },
            )
            .select('display_name, is_admin')
            .single();

          profile = createdProfile;
        }

        const authEmail = data.user.email ?? email;

        return {
          id: data.user.id,
          name: profile?.display_name || fallbackDisplayName,
          email: authEmail,
          isAdmin: profile?.is_admin || false,
          isStub: isTelegramStubEmail(authEmail),
        };
      },
    }),
    Credentials({
      id: 'telegram',
      name: 'Telegram',
      credentials: {
        sessionToken: { label: 'Session Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.sessionToken) throw new Error('Session token required');

        const parts = credentials.sessionToken.split('.');
        if (parts.length !== 2) throw new Error('Malformed session token');
        const [payload, sig] = parts as [string, string];

        // Verify HMAC signature
        const secret = env.NEXTAUTH_SECRET;
        const expectedSig = createHmac('sha256', secret).update(payload).digest('base64url');
        if (sig !== expectedSig) throw new Error('Invalid session token signature');

        // Verify expiry
        const { userId, displayName, exp, isStub } = JSON.parse(
          Buffer.from(payload, 'base64url').toString(),
        ) as { userId: string; displayName: string; exp: number; isStub?: boolean };
        if (Date.now() > exp) throw new Error('Session token expired');

        // Fetch latest display name
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('display_name')
          .eq('id', userId)
          .single();

        return {
          id: userId,
          name: profile?.display_name || displayName,
          email: undefined,
          isStub: isStub ?? false,
        };
      },
    }),
  ],
  pages: {
    signIn: '/tg',
    error: '/tg',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.displayName = user.name || undefined;
        token.email = user.email || undefined;
        token.isAdmin = user.isAdmin || false;
        token.isStub = user.isStub ?? false;
      } else if (token.userId) {
        // On refresh, fetch the latest display_name and isAdmin from database
        try {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('display_name, is_admin')
            .eq('id', token.userId)
            .single();

          if (profile?.display_name) {
            token.displayName = profile.display_name;
          }

          // Check if admin via is_admin column or ADMIN_EMAILS env
          let isAdmin = profile?.is_admin || false;
          if (!isAdmin && env.ADMIN_EMAILS) {
            try {
              const { data } = await supabaseAdmin.auth.admin.getUserById(token.userId);
              if (data.user?.email) {
                token.email = data.user.email;
                const adminEmails = env.ADMIN_EMAILS.split(',').map((e) => e.trim());
                isAdmin = adminEmails.includes(data.user.email);
                token.isStub = isTelegramStubEmail(data.user.email);
              }
            } catch {
              // If error, keep existing isAdmin
            }
          }
          token.isAdmin = isAdmin;
        } catch {
          // If error, keep existing values
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
        if (token.displayName) {
          session.user.name = token.displayName;
        }
        if (token.email) {
          session.user.email = token.email;
        }
        session.user.isAdmin = token.isAdmin || false;
        session.user.isStub = token.isStub || false;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};
