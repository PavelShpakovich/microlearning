import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// API routes that skip auth
const PUBLIC_API_ROUTES = ['/api/auth', '/api/telegram/webhook', '/api/cron'];

// Public pages requiring no auth
const PUBLIC_PAGES = [
  '/',
  '/privacy',
  '/terms',
  '/login',
  '/register',
  '/forgot-password',
  '/set-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 301-redirect legacy locale-prefixed paths: /en[/...] → /[...], /ru[/...] → /[...]
  const localeMatch = /^\/(en|ru)(\/.*)?$/.exec(pathname);
  if (localeMatch) {
    const rest = localeMatch[2] || '/';
    return NextResponse.redirect(new URL(rest, request.url), { status: 301 });
  }

  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (pathname === '/tg' || pathname.startsWith('/tg/')) {
    return NextResponse.next();
  }

  if (PUBLIC_PAGES.includes(pathname)) {
    return NextResponse.next();
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
  matcher: ['/((?!_next|favicon\\.ico|[\\w-]+\\.[\\w]+$).*)'],
};
