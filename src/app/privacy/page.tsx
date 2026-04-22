import type { Metadata } from 'next';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isRu = locale === 'ru';
  const title = isRu ? 'Политика конфиденциальности' : 'Privacy Policy';
  const description = isRu
    ? 'Прочитайте Политику конфиденциальности Clario — как мы собираем, используем и защищаем ваши данные.'
    : 'Read the Clario Privacy Policy — how we collect, use, and protect your data.';
  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/privacy` },
    robots: { index: true, follow: true },
  };
}

export default async function PrivacyPage() {
  const t = await getTranslations('privacy');
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
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16 sm:px-6">
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
          <h2 className="text-xl font-semibold mb-3">{t('section12Title')}</h2>
          <p className="text-muted-foreground leading-relaxed mb-2">{t('section12Body')}</p>
          <a href={`mailto:${supportEmail}`} className="text-primary hover:underline font-medium">
            {supportEmail}
          </a>
        </div>
      </div>
    </main>
  );
}
