import type { MetadataRoute } from 'next';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/ru/', '/ru', '/privacy', '/ru/privacy', '/terms', '/ru/terms'],
        disallow: ['/dashboard', '/admin', '/settings', '/study/', '/themes/', '/api/', '/tg'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
