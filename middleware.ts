import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/register',
  '/auth',
  '/tg', // Telegram callback
];

// API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth', // NextAuth routes
  '/api/auth/telegram', // Telegram auth endpoint
];

/**
 * Returns true if the request carries a Supabase session cookie.
 * Telegram users authenticate via Supabase (not NextAuth), so their session
 * is stored in an `sb-*-auth-token` cookie rather than `next-auth.session-token`.
 * We only check for the cookie's existence here — the API routes independently
 * validate the token via supabase.auth.getUser().
 */
function hasSupabaseSession(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => /^sb-.+-auth-token/.test(cookie.name) && !!cookie.value);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all API public routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow all public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for NextAuth JWT (email/password users — Edge-compatible).
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.SUPABASE_SERVICE_KEY,
  });

  // Check for Supabase session cookie (Telegram Mini App users).
  const supabaseSession = hasSupabaseSession(request);

  // If user is not authenticated and trying to access protected route
  if (!token && !supabaseSession) {
    // If it's an API route, return 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Redirect to /tg — it auto-authenticates Telegram users via initData,
    // and falls back to /login for regular web users. This handles the case
    // where the Telegram Mini App "Launch App" button opens the root URL
    // instead of /tg directly.
    const tgUrl = new URL('/tg', request.url);
    tgUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(tgUrl);
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
