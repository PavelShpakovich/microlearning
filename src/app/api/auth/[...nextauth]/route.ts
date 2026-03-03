import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Extend NextAuth types
declare module 'next-auth' {
  interface User {
    id: string;
  }
  interface Session {
    user: User & {
      id: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
  }
}

const handler = NextAuth({
  providers: [
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

        try {
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
              display_name: data.user.email?.split('@')[0],
            });
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: profile?.display_name || undefined,
          };
        } catch (error) {
          console.error('Auth provider error:', error);
          throw error;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login?error=auth',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
});

export { handler as GET, handler as POST };
