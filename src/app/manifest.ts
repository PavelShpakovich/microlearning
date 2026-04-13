import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clario — AI-астрологические разборы',
    short_name: 'Clario',
    description:
      'Создавайте натальные карты, получайте AI-разборы и сохраняйте астрологические инсайты в одном пространстве.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f1e8',
    theme_color: '#132238',
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
