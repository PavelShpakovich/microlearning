'use client';

import { useLayoutEffect, useState } from 'react';
import { Layers, FileText, GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const STORAGE_KEY = 'clario_welcome_seen';

const steps = [
  { icon: Layers, labelKey: 'step1Label', descKey: 'step1Desc' },
  { icon: FileText, labelKey: 'step2Label', descKey: 'step2Desc' },
  { icon: GraduationCap, labelKey: 'step3Label', descKey: 'step3Desc' },
] as const;

export function WelcomeModal() {
  const t = useTranslations('welcome');
  const { status } = useSession();
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    // Check if user is authenticated and hasn't seen the modal
    if (status !== 'authenticated') return;

    // Queue the state update to avoid cascading render warning
    queueMicrotask(() => {
      try {
        if (!localStorage.getItem(STORAGE_KEY)) {
          setOpen(true);
        }
      } catch {
        // localStorage may be unavailable in some environments
      }
    });
  }, [status]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-xl">{t('title')}</AlertDialogTitle>
          <AlertDialogDescription className="text-center">{t('subtitle')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          {steps.map(({ icon: Icon, labelKey, descKey }, idx) => (
            <div key={labelKey} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                {idx + 1}
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <Icon className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium leading-tight">{t(labelKey)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <AlertDialogFooter>
          <AlertDialogAction onClick={handleDismiss} className="w-full">
            {t('cta')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
