import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/', // Landing / home page
  '/login',
  '/register',
  '/auth',
  '/privacy',
  '/terms',
  '/tg', // Telegram Mini App entry point
];

// API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth', // NextAuth + Telegram auth endpoints
  '/api/profile/upgrade-stub', // Telegram stub self-authenticates via HMAC
  '/api/profile/link-web', // Telegram stub self-authenticates via HMAC
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all public API routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow all public page routes (exact match or sub-path, e.g. /auth/callback)
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Single auth check: NextAuth JWT covers both email and Telegram users.
  // Both flows produce a next-auth.session-token cookie — no dual-system needed.
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.SUPABASE_SERVICE_KEY,
  });

  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Redirect unauthenticated users to /tg which auto-authenticates inside
    // Telegram and falls back to /login for regular web users.
    const tgUrl = new URL('/tg', request.url);
    tgUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(tgUrl);
  }

  // Admin routes: check isAdmin flag
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const isAdmin = (token as Record<string, unknown>).isAdmin === true;
    if (!isAdmin) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Match all request paths except for the ones starting with:
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - public (public files)
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
