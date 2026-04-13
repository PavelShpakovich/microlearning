import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { LandingFooter } from '@/components/layout/landing-footer';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export const metadata: Metadata = {
  title: 'Условия использования',
  description:
    'Прочитайте Условия использования Clario — правила и условия пользования платформой.',
  alternates: { canonical: `${APP_URL}/terms` },
  robots: { index: true, follow: true },
};

export default async function TermsPage() {
  const t = await getTranslations('terms');
  const supportEmail = process.env.SUPPORT_EMAIL ?? 'support@example.com';

  const sections = [
    { title: t('section1Title'), body: t('section1Body') },
    { title: t('section2Title'), body: t('section2Body') },
    { title: t('section3Title'), body: t('section3Body') },
    { title: t('section4Title'), body: t('section4Body') },
    { title: t('section5Title'), body: t('section5Body') },
    { title: t('section6Title'), body: t('section6Body') },
    { title: t('section7Title'), body: t('section7Body') },
    { title: t('section8Title'), body: t('section8Body') },
    { title: t('section9Title'), body: t('section9Body') },
    { title: t('section10Title'), body: t('section10Body') },
    { title: t('section11Title'), body: t('section11Body') },
    { title: t('section12Title'), body: t('section12Body') },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/"
            className="inline-block mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('backToHome')}
          </Link>

          <h1 className="text-4xl font-bold mb-2 text-balance">{t('pageTitle')}</h1>
          <p className="text-sm text-muted-foreground mb-10">{t('lastUpdated')}</p>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-muted-foreground leading-relaxed mb-10">{t('intro')}</p>

            {sections.map(({ title, body }) => (
              <div key={title} className="mb-8">
                <h2 className="text-xl font-semibold mb-3">{title}</h2>
                <p className="text-muted-foreground leading-relaxed">{body}</p>
              </div>
            ))}

            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-3">{t('section13Title')}</h2>
              <p className="text-muted-foreground leading-relaxed mb-2">{t('section13Body')}</p>
              <a
                href={`mailto:${supportEmail}`}
                className="text-primary hover:underline font-medium"
              >
                {supportEmail}
              </a>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
