import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { Button } from '@/components/ui/button';
import { Accordion } from '@/components/ui/accordion';
import { HeroSection } from '@/components/landing/hero-section';
import { FeatureCard } from '@/components/landing/feature-card';
import { StepItem } from '@/components/landing/step-item';
import { FaqItem } from '@/components/landing/faq-item';
import { SectionHeader } from '@/components/landing/section-header';
import {
  Orbit,
  MoonStar,
  ScrollText,
  Sparkles,
  BookOpen,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isRu = locale === 'ru';

  const title = isRu
    ? 'Clario — Персональный разбор по дате рождения'
    : 'Clario — Personal AI Reading by Birth Date';
  const description = isRu
    ? 'Получите развёрнутый персональный разбор по дате рождения: характер, отношения, карьера, сильные стороны. Точные расчёты + AI-интерпретация. Бесплатно.'
    : 'Get a detailed personal reading by birth date: personality, relationships, career, strengths. Precise calculations + AI interpretation. Free to try.';

  const keywords = isRu
    ? 'разбор личности, персональный разбор по дате рождения, AI разбор, карта личности онлайн, анализ личности, самопознание, персональный профиль, психологический портрет'
    : 'personality reading, birth date analysis, AI personal reading, personality profile online, self-knowledge, personal profile, psychological portrait';

  return {
    title,
    description,
    keywords,
    alternates: { canonical: APP_URL },
    openGraph: {
      type: 'website',
      title,
      description,
      url: APP_URL,
      siteName: 'Clario',
      locale: isRu ? 'ru_RU' : 'en_US',
      images: [
        {
          url: '/opengraph-image',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
  };
}

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  const t = await getTranslations('landing');

  const locale = await getLocale();
  const isRu = locale === 'ru';

  const appName = isRu
    ? 'Clario — Персональный разбор по дате рождения'
    : 'Clario — Personal AI Reading by Birth Date';
  const appDesc = isRu
    ? 'Получите развёрнутый персональный разбор по дате рождения: характер, отношения, карьера, сильные стороны. Точные расчёты + AI-интерпретация. Бесплатно.'
    : 'Get a detailed personal reading by birth date: personality, relationships, career, strengths. Precise calculations + AI interpretation. Free to try.';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${APP_URL}/#organization`,
        name: 'Clario',
        url: APP_URL,
        logo: { '@type': 'ImageObject', url: `${APP_URL}/apple-touch-icon.png` },
      },
      {
        '@type': 'WebSite',
        '@id': `${APP_URL}/#website`,
        url: APP_URL,
        name: 'Clario',
        publisher: { '@id': `${APP_URL}/#organization` },
      },
      {
        '@type': 'WebApplication',
        name: appName,
        description: appDesc,
        url: APP_URL,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web',
        inLanguage: isRu ? 'ru' : 'en',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: isRu ? 'RUB' : 'USD',
          availability: 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: t('faq1Q'),
            acceptedAnswer: { '@type': 'Answer', text: t('faq1A') },
          },
          {
            '@type': 'Question',
            name: t('faq2Q'),
            acceptedAnswer: { '@type': 'Answer', text: t('faq2A') },
          },
          {
            '@type': 'Question',
            name: t('faq3Q'),
            acceptedAnswer: { '@type': 'Answer', text: t('faq3A') },
          },
          {
            '@type': 'Question',
            name: t('faq4Q'),
            acceptedAnswer: { '@type': 'Answer', text: t('faq4A') },
          },
          {
            '@type': 'Question',
            name: t('faq5Q'),
            acceptedAnswer: { '@type': 'Answer', text: t('faq5A') },
          },
          {
            '@type': 'Question',
            name: t('faq6Q'),
            acceptedAnswer: { '@type': 'Answer', text: t('faq6A') },
          },
        ],
      },
    ],
  };

  return (
    <main className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <HeroSection
        tagline={t('heroTagline')}
        headline={t('heroHeadline')}
        subheadline={t('heroSubheadline')}
        ctaGetStarted={t('heroCtaStart')}
        ctaLogin={t('heroCtaLogin')}
      />

      {/* Stats strip */}
      <div className="border-y bg-muted/20">
        <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x px-4 py-6 text-center sm:px-6">
          <div className="px-3 sm:px-6">
            <p className="text-2xl font-bold text-primary sm:text-3xl">12</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground sm:mt-1.5 sm:text-xs">
              {t('statsPlanets')}
            </p>
          </div>
          <div className="px-3 sm:px-6">
            <p className="text-2xl font-bold text-primary sm:text-3xl">6</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground sm:mt-1.5 sm:text-xs">
              {t('statsReadingTypes')}
            </p>
          </div>
          <div className="px-3 sm:px-6">
            <p className="text-2xl font-bold text-primary sm:text-3xl">5</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground sm:mt-1.5 sm:text-xs">
              {t('statsFollowUps')}
            </p>
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <SectionHeader title={t('howTitle')} subtitle={t('howSubtitle')} narrow />
        <div className="flex flex-col gap-10">
          <StepItem number="1" title={t('howStep1Title')} desc={t('howStep1Desc')} />
          <StepItem number="2" title={t('howStep2Title')} desc={t('howStep2Desc')} />
          <StepItem number="3" title={t('howStep3Title')} desc={t('howStep3Desc')} />
          <StepItem number="4" title={t('howStep4Title')} desc={t('howStep4Desc')} isLast />
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeader title={t('featuresTitle')} subtitle={t('featuresSubtitle')} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={Orbit} title={t('feat1Title')} desc={t('feat1Desc')} />
            <FeatureCard icon={ScrollText} title={t('feat2Title')} desc={t('feat2Desc')} />
            <FeatureCard icon={MoonStar} title={t('feat3Title')} desc={t('feat3Desc')} />
            <FeatureCard icon={BookOpen} title={t('feat4Title')} desc={t('feat4Desc')} />
            <FeatureCard icon={ShieldCheck} title={t('feat5Title')} desc={t('feat5Desc')} />
            <FeatureCard icon={MessageCircle} title={t('feat6Title')} desc={t('feat6Desc')} />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <SectionHeader title={t('faqTitle')} subtitle={t('faqSubtitle')} narrow />
        <Accordion type="single" collapsible className="flex flex-col gap-2">
          <FaqItem value="faq1" question={t('faq1Q')} answer={t('faq1A')} />
          <FaqItem value="faq2" question={t('faq2Q')} answer={t('faq2A')} />
          <FaqItem value="faq3" question={t('faq3Q')} answer={t('faq3A')} />
          <FaqItem value="faq4" question={t('faq4Q')} answer={t('faq4A')} />
          <FaqItem value="faq5" question={t('faq5Q')} answer={t('faq5A')} />
          <FaqItem value="faq6" question={t('faq6Q')} answer={t('faq6A')} />
        </Accordion>
      </section>

      {/* Bottom CTA */}
      <section className="relative overflow-hidden border-t">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 80% at 50% 100%, oklch(0.20 0.06 268 / 40%) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-24 text-center sm:px-6">
          <Sparkles className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('ctaTitle')}</h2>
          <p className="text-muted-foreground">{t('ctaSubtitle')}</p>
          <Button asChild size="lg" className="px-10 shadow-lg shadow-primary/20">
            <Link href="/register">{t('ctaButton')}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
