import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

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

  // Check session for protected routes
  const session = await auth();

  // If user is not authenticated and trying to access protected route
  if (!session) {
    // If it's an API route, return 401
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Otherwise redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
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
