import type { NextAuthOptions } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { decode as nextAuthJwtDecode, encode as nextAuthJwtEncode } from 'next-auth/jwt';
import { createHmac } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';

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
    isAdmin?: boolean;
    isStub?: boolean;
  }
}

const nextAuthSecret = env.NEXTAUTH_SECRET;

export const authOptions: NextAuthOptions = {
  secret: nextAuthSecret,
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
          isStub: isStub ?? false,
        };
      },
    }),
    Credentials({
      id: 'credentials',
      name: 'Email/Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const { data, error } = await supabaseAdmin.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error || !data.user) {
          throw new Error('Invalid email or password');
        }

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (!profile) {
          await supabaseAdmin.from('profiles').insert({
            id: data.user.id,
            telegram_id: null,
            display_name: deriveDisplayNameFromEmail(data.user.email),
          });
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name: profile?.display_name || deriveDisplayNameFromEmail(data.user.email),
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.displayName = user.name || undefined;
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
                const adminEmails = env.ADMIN_EMAILS.split(',').map((e) => e.trim());
                isAdmin = adminEmails.includes(data.user.email);
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
        session.user.isAdmin = token.isAdmin || false;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};
