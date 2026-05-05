'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Sparkles, Heart, Briefcase, TrendingUp, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { preferencesApi, profileApi } from '@clario/api-client';

type FocusOption = 'love' | 'career' | 'growth' | 'all';
type ToneOption = 'balanced' | 'mystical' | 'therapeutic' | 'analytical';

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const tSettings = useTranslations('settingsPage');
  const tNav = useTranslations('navigation');
  const tChart = useTranslations('chartForm');
  const [step, setStep] = useState<1 | 2>(1);
  const [focus, setFocus] = useState<FocusOption | null>(null);
  const [tone, setTone] = useState<ToneOption | null>(null);
  const [allowSpiritualTone, setAllowSpiritualTone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleFinish() {
    if (!tone) return;
    setSaving(true);
    try {
      const prefsPayload = {
        toneStyle: tone,
        contentFocusLove: focus === 'love' || focus === 'all',
        contentFocusCareer: focus === 'career' || focus === 'all',
        contentFocusGrowth: focus === 'growth' || focus === 'all',
        allowSpiritualTone: allowSpiritualTone,
      };
      await Promise.all([
        preferencesApi.updatePreferences(prefsPayload),
        profileApi.updateProfile({ onboardingCompleted: true }),
      ]);
      router.push('/dashboard');
    } catch {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-16 sm:px-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {step === 1 ? t('step1Title') : t('step2Title')}
        </h1>
        <p className="text-sm text-muted-foreground">
          {step === 1 ? t('step1Desc') : t('step2Desc')}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2].map((s) => (
          <span
            key={s}
            className={`h-1.5 w-8 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-primary/20'}`}
          />
        ))}
      </div>

      {/* Step 1 — Focus */}
      {step === 1 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: 'love' as const,
                label: t('focusLove'),
                desc: t('focusLoveDesc'),
                icon: Heart,
              },
              {
                value: 'career' as const,
                label: t('focusCareer'),
                desc: t('focusCareerDesc'),
                icon: Briefcase,
              },
              {
                value: 'growth' as const,
                label: t('focusGrowth'),
                desc: t('focusGrowthDesc'),
                icon: TrendingUp,
              },
              {
                value: 'all' as const,
                label: t('focusAll'),
                desc: t('focusAllDesc'),
                icon: Layers,
              },
            ] satisfies {
              value: FocusOption;
              label: string;
              desc: string;
              icon: React.ElementType;
            }[]
          ).map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFocus(value)}
              className={`flex flex-col gap-2 rounded-2xl border p-4 text-left transition-colors hover:border-primary/60 ${
                focus === value ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <Icon
                className={`size-5 ${focus === value ? 'text-primary' : 'text-muted-foreground'}`}
              />
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(
            [
              {
                value: 'balanced' as const,
                label: tSettings('toneBalanced'),
                desc: t('toneBalancedDesc'),
              },
              {
                value: 'mystical' as const,
                label: tSettings('toneMystical'),
                desc: t('toneMysticalDesc'),
              },
              {
                value: 'therapeutic' as const,
                label: tSettings('toneTherapeutic'),
                desc: t('toneTherapeuticDesc'),
              },
              {
                value: 'analytical' as const,
                label: tSettings('toneAnalytical'),
                desc: t('toneAnalyticalDesc'),
              },
            ] satisfies { value: ToneOption; label: string; desc: string }[]
          ).map(({ value, label, desc }) => (
            <button
              key={value}
              onClick={() => setTone(value)}
              className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors hover:border-primary/60 ${
                tone === value ? 'border-primary bg-primary/5' : ''
              }`}
            >
              <p className={`font-semibold text-sm ${tone === value ? 'text-primary' : ''}`}>
                {label}
              </p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </button>
          ))}

          <div className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold">{tSettings('spiritualTone')}</p>
                <p className="text-xs text-muted-foreground">{tSettings('spiritualToneHint')}</p>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={allowSpiritualTone} onCheckedChange={setAllowSpiritualTone} />
                <span className="text-xs text-muted-foreground">
                  {allowSpiritualTone ? tSettings('on') : tSettings('off')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {step === 2 ? (
          <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
            {tNav('back')}
          </Button>
        ) : null}
        {step === 1 ? (
          <Button className="flex-1" disabled={!focus} onClick={() => setStep(2)}>
            {tChart('nextStep')}
          </Button>
        ) : (
          <Button className="flex-1" disabled={!tone || saving} onClick={() => void handleFinish()}>
            {saving ? t('saving') : t('start')}
          </Button>
        )}
      </div>

      <button
        className="text-center text-xs text-muted-foreground hover:underline"
        onClick={() =>
          void (async () => {
            await profileApi.updateProfile({ onboardingCompleted: true });
            router.push('/dashboard');
          })()
        }
      >
        {t('skip')}
      </button>
    </main>
  );
}
