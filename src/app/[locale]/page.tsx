import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { LandingFooter } from '@/components/layout/landing-footer';
import { Accordion } from '@/components/ui/accordion';
import { Upload, Sparkles, BrainCircuit, MessageSquare } from 'lucide-react';
import { HeroSection } from '@/components/landing/hero-section';
import { SectionHeader } from '@/components/landing/section-header';
import { FeatureCard } from '@/components/landing/feature-card';
import { StepItem } from '@/components/landing/step-item';
import { PlanCard } from '@/components/landing/plan-card';
import { FaqItem } from '@/components/landing/faq-item';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { routing } from '@/i18n/routing';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isRu = locale === 'ru';
  const canonical = isRu ? `${APP_URL}/ru` : APP_URL;

  const titleEn = 'Clario — AI Flashcard Generator';
  const descEn =
    'Turn any topic, document, or URL into AI-generated study cards in seconds. Learn smarter inside Telegram.';
  const titleRu = 'Clario — ИИ-генератор карточек для обучения';
  const descRu =
    'Превратите любую тему, документ или URL в карточки для обучения за секунды. Учитесь умнее в Telegram.';

  return {
    title: isRu ? titleRu : titleEn,
    description: isRu ? descRu : descEn,
    alternates: {
      canonical,
      languages: {
        en: APP_URL,
        ru: `${APP_URL}/ru`,
        'x-default': APP_URL,
      },
    },
    openGraph: {
      title: isRu ? titleRu : titleEn,
      description: isRu ? descRu : descEn,
      url: canonical,
      locale: isRu ? 'ru_RU' : 'en_US',
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Clario' }],
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session) redirect('/dashboard');

  const t = await getTranslations('landing');

  // Fetch plan data from DB
  const { data: dbPlans } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, name, cards_per_month, max_themes, stars_price')
    .order('stars_price', { ascending: true });

  type DbPlan = NonNullable<typeof dbPlans>[number];

  function buildFeatures(plan: DbPlan, tl: typeof t): string[] {
    const cards = plan.cards_per_month.toLocaleString();
    const themes =
      plan.max_themes === null
        ? tl('featureUnlimitedThemes')
        : tl('featureThemes', { count: plan.max_themes });
    if (plan.id === 'free') return [themes, tl('featureCards', { count: cards })];
    return [themes, tl('featureCards', { count: cards }), tl('featureCommunity')];
  }

  const planNames: Record<string, string> = {
    free: t('plan1Name'),
    basic: t('plan2Name'),
    pro: t('plan3Name'),
    max: t('plan4Name'),
  };

  const plans = (dbPlans ?? []).map((plan) => ({
    id: plan.id,
    name: planNames[plan.id] ?? plan.name,
    starsPrice: plan.stars_price,
    features: buildFeatures(plan, t),
    popular: plan.id === 'basic',
  }));

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

  // JSON-LD structured data
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  const appSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Clario',
    applicationCategory: 'EducationApplication',
    operatingSystem: 'Telegram',
    description: t('heroSubheadline'),
    url: APP_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />

      {/* ── Hero ── */}
      <HeroSection
        tagline={t('heroTagline')}
        headline={t('heroHeadline')}
        subheadline={t('heroSubheadline')}
        ctaGetStarted={t('ctaGetStarted')}
      />

      {/* ── Features ── */}
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

      {/* ── How It Works ── */}
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

      {/* ── Pricing ── */}
      <section className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <SectionHeader title={t('pricingTitle')} subtitle={t('pricingSubtitle')} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                name={plan.name}
                starsPrice={plan.starsPrice}
                features={plan.features}
                popular={plan.popular}
                popularLabel={t('pricingPopular')}
                freeLabel={t('pricingFree')}
                perMonth={t('pricingPerMonth')}
                cta={t('pricingCta')}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
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
