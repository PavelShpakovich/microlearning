import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/privacy', '/terms', '/login', '/register'],
        disallow: [
          '/dashboard',
          '/charts/',
          '/readings/',
          '/admin',
          '/settings',
          '/api/',
          '/compatibility',
          '/horoscope',
          '/calendar',
          '/onboarding',
          '/chat',
          '/set-password',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
