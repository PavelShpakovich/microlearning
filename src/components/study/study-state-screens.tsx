'use client';

import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-background snap-start snap-always px-6">
      {children}
    </div>
  );
}

function SpinnerBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function StudyInitialLoadingScreen() {
  const t = useTranslations();
  return (
    <ScreenShell>
      <SpinnerBlock label={t('study.preparing')} />
    </ScreenShell>
  );
}

export function StudyGeneratingScreen() {
  const t = useTranslations();
  return (
    <ScreenShell>
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl border border-border">
            <Sparkles className="w-5 h-5 text-foreground animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            {t('study.generatingCards')}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('study.creatingFlashcards')}
          </p>
        </div>

        <div className="flex justify-center items-center gap-1.5">
          {[0, 0.15, 0.3].map((delay) => (
            <span
              key={delay}
              className="block w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-pulse"
              style={{ animationDelay: `${delay}s` }}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground/50">{t('study.typicalTime')}</p>
      </div>
    </ScreenShell>
  );
}

export function StudyLoadingMoreScreen() {
  const t = useTranslations();
  return (
    <ScreenShell>
      <SpinnerBlock label={t('study.generatingMore')} />
    </ScreenShell>
  );
}

export function StudyDoneScreen() {
  const t = useTranslations();
  const router = useRouter();
  return (
    <ScreenShell>
      <div className="w-full max-w-xs text-center space-y-8">
        <div className="space-y-4">
          <CheckCircle2 className="w-10 h-10 text-foreground mx-auto" strokeWidth={1.5} />
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t('study.finished')}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('study.completedSession')}
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            router.refresh();
            router.push('/dashboard');
          }}
          className="inline-flex items-center justify-center w-full rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 active:opacity-80"
        >
          {t('study.backToDashboard')}
        </button>
      </div>
    </ScreenShell>
  );
}
