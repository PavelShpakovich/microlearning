import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './src/i18n/routing';

// Handles locale detection + x-next-intl-locale header for public pages only
const intlMiddleware = createIntlMiddleware(routing);

// Base public page paths (without locale prefix)
const PUBLIC_PAGE_BASES = ['/', '/privacy', '/terms'];

/** Returns true for any public page path, with or without /ru prefix */
function isPublicPage(pathname: string): boolean {
  const stripped = pathname.replace(/^\/ru\b/, '') || '/';
  return PUBLIC_PAGE_BASES.includes(stripped);
}

// API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth', // NextAuth + Telegram auth endpoints
  '/api/profile/link-web', // Telegram stub self-authenticates via HMAC
  '/api/telegram/webhook', // Telegram Bot API webhook — authenticated via secret token header
  '/api/cron', // Vercel Cron jobs — authenticated via CRON_SECRET header
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all public API routes
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // /tg: Telegram Mini App entry — no i18n, no auth check needed in middleware
  if (pathname === '/tg' || pathname.startsWith('/tg/')) {
    return NextResponse.next();
  }

  // Public pages: run i18n middleware (handles locale prefix + sets x-next-intl-locale header)
  if (isPublicPage(pathname)) {
    return intlMiddleware(request);
  }

  // Protected routes: auth check
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Redirect unauthenticated users to /tg which auto-authenticates inside Telegram.
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
   * - _next (Next.js internals)
   * - favicon.ico (favicon file)
   * - Any file with an extension (static assets from /public)
   */
  matcher: ['/((?!_next|favicon\\.ico|[\\w-]+\\.[\\w]+$).*)'],
};
