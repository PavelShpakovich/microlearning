import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// API routes that skip auth
const PUBLIC_API_ROUTES = ['/api/auth', '/api/cron'];

// Public pages requiring no auth
const PUBLIC_PAGES = [
  '/',
  '/privacy',
  '/terms',
  '/login',
  '/register',
  '/forgot-password',
  '/set-password',
  '/auth/callback',
  '/auth/reset-confirm',
];

// Pages allowed when NEXT_PUBLIC_MOBILE_ONLY=true
const MOBILE_ONLY_ALLOWED_PAGES = ['/privacy', '/terms', '/auth/callback', '/auth/reset-confirm'];

// Hardcoded: restrict web to mobile-only allowed pages.
// Set to false to re-enable all pages.
const MOBILE_ONLY = process.env.NEXT_PUBLIC_MOBILE_ONLY === 'true';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Inject x-pathname so server layouts can detect the current route.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Forward explicit ?lang= param (e.g. from mobile app deep-links to /privacy or /terms)
  const langParam = request.nextUrl.searchParams.get('lang');
  if (langParam) {
    requestHeaders.set('x-lang', langParam);
  }

  // ── Mobile-only mode ────────────────────────────────────────────────────────
  // When MOBILE_ONLY=true all page routes except privacy, terms and
  // auth/callback redirect to /terms. API routes are always allowed.
  if (MOBILE_ONLY && !pathname.startsWith('/api')) {
    const allowed = MOBILE_ONLY_ALLOWED_PAGES.some(
      (p) => pathname === p || pathname.startsWith(p + '/'),
    );
    if (!allowed) {
      return NextResponse.redirect(new URL('/terms', request.url));
    }
  }

  // Handle CORS preflight for all routes (mobile Expo web dev)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Request-Id',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // 301-redirect legacy locale-prefixed paths: /en[/...] → /[...], /ru[/...] → /[...]
  const localeMatch = /^\/(en|ru)(\/.*)?$/.exec(pathname);
  if (localeMatch) {
    const rest = localeMatch[2] || '/';
    return NextResponse.redirect(new URL(rest, request.url), { status: 301 });
  }

  const nextWithHeaders = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return nextWithHeaders();
  }

  // Mobile clients authenticate via Supabase Bearer token.
  // Let the route handler's requireAuth() validate it — no NextAuth JWT involved.
  const authHeader = request.headers.get('authorization');
  if (pathname.startsWith('/api') && authHeader?.startsWith('Bearer ')) {
    return nextWithHeaders();
  }

  if (PUBLIC_PAGES.includes(pathname)) {
    return nextWithHeaders();
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const isEmailVerified = (token as Record<string, unknown>).isEmailVerified !== false;
  if (!isEmailVerified) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Email verification required' }, { status: 403 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('verified', 'error');
    loginUrl.searchParams.set('callbackUrl', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const isAdmin = (token as Record<string, unknown>).isAdmin === true;
    if (!isAdmin) {
      if (pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Forbidden - admin access required' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  const response = nextWithHeaders();
  response.headers.set('Content-Language', 'ru');
  return response;
}

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|[\\w-]+\\.[\\w]+$).*)'],
};
// kept for backward compatibility — actual config is re-declared in middleware.ts
