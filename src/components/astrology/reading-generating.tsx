'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReadingGeneratingProps {
  readingId: string;
}

const PROGRESS_STEPS = [
  { key: 'analyzing', delayMs: 0 },
  { key: 'writing', delayMs: 8000 },
  { key: 'reviewing', delayMs: 24000 },
  { key: 'finalizing', delayMs: 44000 },
] as const;

const POLL_INTERVAL_MS = 4000;

export function ReadingGenerating({ readingId }: ReadingGeneratingProps) {
  const router = useRouter();
  const t = useTranslations('readingGenerating');
  const [stepIndex, setStepIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const didFire = useRef(false);

  // Advance progress indicators independently of network.
  useEffect(() => {
    const timers = PROGRESS_STEPS.slice(1).map(({ delayMs }, i) =>
      setTimeout(() => setStepIndex(i + 1), delayMs),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Fire generation exactly once (survives Strict Mode double-mount)
  useEffect(() => {
    if (didFire.current) return;
    didFire.current = true;

    fetch(`/api/readings/${readingId}/generate`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error('generation failed');
        router.refresh();
      })
      .catch(() => {
        setFailed(true);
      });
  }, [readingId, router]);

  // Poll status as a safety net: catches the case where the reading was
  // already `generating` (idempotency early-return) or when the fetch
  // response is lost. Unmounts naturally once the parent stops rendering
  // this component.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/readings/${readingId}`, { method: 'GET' });
        if (!res.ok) return;
        const data = (await res.json()) as { status: string };
        if (data.status === 'ready') {
          router.refresh();
        } else if (data.status === 'error') {
          setFailed(true);
        }
      } catch {
        // network hiccup — try again next tick
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [readingId, router]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <div>
          <p className="font-semibold text-destructive">{t('errorTitle')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t('errorDesc')}</p>
        </div>
        <Button variant="outline" onClick={() => router.refresh()}>
          {t('refreshButton')}
        </Button>
      </div>
    );
  }

  const currentStep = PROGRESS_STEPS[stepIndex];

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-primary/20 bg-primary/5 px-6 py-12 text-center">
      <div className="relative flex items-center justify-center">
        <Sparkles className="size-8 text-primary opacity-80" />
        <Loader2 className="absolute size-14 animate-spin text-primary/20" />
      </div>
      <div>
        <p className="text-base font-semibold">{t('title')}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t(currentStep.key)}</p>
      </div>
      <div className="flex gap-2">
        {PROGRESS_STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 w-6 rounded-full transition-all duration-700 ${
              i <= stepIndex ? 'bg-primary' : 'bg-primary/20'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
