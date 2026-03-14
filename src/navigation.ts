// Locale-based URL routing removed — all routes are flat (/).
// These re-exports keep the same import paths in auth/landing components.
export { default as Link } from 'next/link';
export { redirect, useRouter, usePathname } from 'next/navigation';
