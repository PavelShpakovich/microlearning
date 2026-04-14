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
  const isRu = locale !== 'en';

  const title = isRu ? 'Clario — AI-астрологические разборы' : 'Clario — AI Astrology Readings';
  const description = isRu
    ? 'Создавайте натальные карты, получайте AI-разборы и возвращайтесь к сохранённым инсайтам на основе структурированных астрологических данных.'
    : 'Create natal charts, generate AI astrology readings, and revisit saved insights built from structured chart data.';

  return {
    title,
    description,
    alternates: { canonical: APP_URL },
    openGraph: {
      title,
      description,
      url: APP_URL,
      locale: isRu ? 'ru_RU' : 'en_US',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Clario' }],
    },
  };
}

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  const t = await getTranslations('landing');

  return (
    <main className="min-h-screen">
      {/* Hero */}
      <HeroSection
        tagline={t('heroTagline')}
        headline={t('heroHeadline')}
        subheadline={t('heroSubheadline')}
        ctaGetStarted={t('heroCtaStart')}
        ctaLogin={t('heroCtaLogin')}
      />

      {/* Stats strip */}
      <div className="border-y bg-muted/30">
        <div className="mx-auto grid max-w-4xl grid-cols-3 divide-x px-4 py-6 text-center sm:px-6">
          <div className="px-4">
            <p className="text-2xl font-bold">10</p>
            <p className="mt-1 text-xs text-muted-foreground">планет и углов</p>
          </div>
          <div className="px-4">
            <p className="text-2xl font-bold">9</p>
            <p className="mt-1 text-xs text-muted-foreground">типов разборов</p>
          </div>
          <div className="px-4">
            <p className="text-2xl font-bold">∞</p>
            <p className="mt-1 text-xs text-muted-foreground">вопросов к разбору</p>
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
          <StepItem number="4" title={t('howStep4Title')} desc={t('howStep4Desc')} />
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
        </Accordion>
      </section>

      {/* Bottom CTA */}
      <section className="border-t bg-primary/5">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-20 text-center sm:px-6">
          <Sparkles className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('ctaTitle')}</h2>
          <p className="text-muted-foreground">{t('ctaSubtitle')}</p>
          <Button asChild size="lg">
            <Link href="/register">{t('ctaButton')}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
