export { proxy as middleware } from './src/proxy';

export const config = {
  matcher: ['/((?!_next|favicon\\.ico|[\\w-]+\\.[\\w]+$).*)'],
};
