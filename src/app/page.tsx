import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { LandingFooter } from '@/components/layout/landing-footer';
import { Accordion } from '@/components/ui/accordion';
import { Upload, Sparkles, BrainCircuit, MessageSquare, Clock3 } from 'lucide-react';
import { HeroSection } from '@/components/landing/hero-section';
import { SectionHeader } from '@/components/landing/section-header';
import { FeatureCard } from '@/components/landing/feature-card';
import { StepItem } from '@/components/landing/step-item';
import { FaqItem } from '@/components/landing/faq-item';
import { isPaidInformationVisible } from '@/lib/feature-flags';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export const metadata: Metadata = {
  title: 'Clario — ИИ-генератор карточек для обучения',
  description:
    'Превратите любую тему, документ или URL в карточки для обучения за секунды. Учитесь умнее в Telegram.',
  alternates: { canonical: APP_URL },
  openGraph: {
    title: 'Clario — ИИ-генератор карточек для обучения',
    description: 'Превратите любую тему, документ или URL в карточки для обучения за секунды.',
    url: APP_URL,
    locale: 'ru_RU',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Clario' }],
  },
};

export default async function LandingPage() {
  const session = await auth();
  if (session) redirect('/dashboard');

  const t = await getTranslations('landing');
  const showPaidInformation = isPaidInformationVisible();

  const features = [
    { icon: Upload, title: t('feature1Title'), desc: t('feature1Desc') },
    { icon: Sparkles, title: t('feature2Title'), desc: t('feature2Desc') },
    { icon: BrainCircuit, title: t('feature3Title'), desc: t('feature3Desc') },
    { icon: MessageSquare, title: t('feature4Title'), desc: t('feature4Desc') },
  ];

  const steps = [
    { number: t('step1Number'), title: t('step1Title'), desc: t('step1Desc') },
    { number: t('step2Number'), title: t('step2Title'), desc: t('step2Desc') },
    { number: t('step3Number'), title: t('step3Title'), desc: t('step3Desc') },
  ];

  const faqs = [
    { q: t('faq1Question'), a: t('faq1Answer') },
    { q: t('faq2Question'), a: t('faq2Answer') },
    { q: t('faq3Question'), a: t('faq3Answer') },
    { q: t('faq4Question'), a: t('faq4Answer') },
    { q: t('faq5Question'), a: t('faq5Answer') },
  ];

  const launchCards = showPaidInformation
    ? [
        {
          title: t('plan2Name'),
          items: [t('plan2Feature1'), t('plan2Feature2'), t('plan2Feature3')],
        },
        {
          title: t('plan3Name'),
          items: [t('plan3Feature1'), t('plan3Feature2'), t('plan3Feature3')],
        },
        {
          title: t('plan4Name'),
          items: [t('plan4Feature1'), t('plan4Feature2'), t('plan4Feature3')],
        },
      ]
    : [
        { title: t('comingSoonCard1Title'), items: [t('comingSoonCard1Body')] },
        { title: t('comingSoonCard2Title'), items: [t('comingSoonCard2Body')] },
        { title: t('comingSoonCard3Title'), items: [t('comingSoonCard3Body')] },
      ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <HeroSection
        tagline={t('heroTagline')}
        headline={t('heroHeadline')}
        subheadline={t('heroSubheadline')}
        ctaGetStarted={t('ctaGetStarted')}
        ctaLogin={t('ctaLogin')}
      />

      <section className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionHeader title={t('featuresTitle')} subtitle={t('featuresSubtitle')} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map(({ icon, title, desc }) => (
              <FeatureCard key={title} icon={icon} title={title} desc={desc} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <SectionHeader title={t('howItWorksTitle')} subtitle={t('howItWorksSubtitle')} narrow />
          <div className="flex flex-col gap-8">
            {steps.map(({ number, title, desc }) => (
              <StepItem key={number} number={number} title={title} desc={desc} />
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title={showPaidInformation ? t('pricingTitle') : t('comingSoonTitle')}
            subtitle={showPaidInformation ? t('pricingSubtitle') : t('comingSoonSubtitle')}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {launchCards.map((card) => (
              <div key={card.title} className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
                {!showPaidInformation && (
                  <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {t('comingSoonBadge')}
                  </div>
                )}
                <h3 className="text-xl font-semibold">{card.title}</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <SectionHeader title={t('faqTitle')} subtitle={t('faqSubtitle')} narrow />
          <Accordion type="single" collapsible className="flex flex-col gap-2">
            {faqs.map((faq, idx) => (
              <FaqItem key={idx} value={`faq-${idx}`} question={faq.q} answer={faq.a} />
            ))}
          </Accordion>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
