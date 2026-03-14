'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, CheckCircle2, Lock, BookOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { areSubscriptionsEnabled, isPaidInformationVisible } from '@/lib/feature-flags';
import { Button } from '@/components/ui/button';
import { revalidateDashboard } from '@/actions/revalidate';

// ---------------------------------------------------------------------------
// Private atoms
// ---------------------------------------------------------------------------

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-background px-6">
      {children}
    </div>
  );
}

function SpinnerBlock({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      <p className="text-md text-muted-foreground">{label}</p>
    </div>
  );
}

interface StudyScreenLayoutProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}

function StudyScreenLayout({ icon, title, description, children }: StudyScreenLayoutProps) {
  return (
    <ScreenShell>
      <div className="w-full max-w-xs text-center space-y-8">
        <div className="space-y-4">
          {icon}
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed text-balance">
              {description}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-3">{children}</div>
      </div>
    </ScreenShell>
  );
}

function BackToDashboardButton() {
  const t = useTranslations();
  const router = useRouter();
  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={async () => {
        await revalidateDashboard();
        router.push('/dashboard');
      }}
    >
      {t('study.backToDashboard')}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// Public screens
// ---------------------------------------------------------------------------

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
            <Sparkles className="w-6 h-6 text-foreground animate-pulse" />
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

export function StudyEmptyScreen({
  canGenerate,
  onGenerate,
  isGenerating,
}: {
  canGenerate?: boolean;
  onGenerate?: () => void;
  isGenerating?: boolean;
}) {
  const t = useTranslations();
  return (
    <StudyScreenLayout
      icon={<BookOpen className="w-10 h-10 text-muted-foreground mx-auto" strokeWidth={1.5} />}
      title={t('study.emptyTitle')}
      description={canGenerate ? t('study.emptyDescription') : t('study.emptyDescriptionReadOnly')}
    >
      {canGenerate && onGenerate && (
        <Button onClick={onGenerate} disabled={isGenerating} className="w-full">
          {isGenerating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          {t('study.startGenerating')}
        </Button>
      )}
      <BackToDashboardButton />
    </StudyScreenLayout>
  );
}

export function StudyLimitReachedScreen() {
  const t = useTranslations();
  const canShowPlans = areSubscriptionsEnabled() && isPaidInformationVisible();
  return (
    <StudyScreenLayout
      icon={<Lock className="w-10 h-10 text-muted-foreground mx-auto" strokeWidth={1.5} />}
      title={t('study.limitReachedTitle')}
      description={t('study.limitReachedDescription')}
    >
      {canShowPlans && (
        <Button asChild className="w-full">
          <Link href="/settings/plan">{t('study.limitReachedCta')}</Link>
        </Button>
      )}
      <BackToDashboardButton />
    </StudyScreenLayout>
  );
}

export function StudyDoneScreen() {
  const t = useTranslations();
  return (
    <StudyScreenLayout
      icon={<CheckCircle2 className="w-10 h-10 text-foreground mx-auto" strokeWidth={1.5} />}
      title={t('study.finished')}
      description={t('study.completedSession')}
    >
      <BackToDashboardButton />
    </StudyScreenLayout>
  );
}
