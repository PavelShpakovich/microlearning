'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSubscription } from '@/hooks/use-subscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const STATUS_STYLES = {
  success: {
    icon: CheckCircle2,
    className: 'border-emerald-500/40 bg-emerald-50 text-emerald-900 [&>svg]:text-emerald-600',
    variant: 'default' as const,
    titleKey: 'returnSuccessTitle',
    descriptionKey: 'returnSuccessDescription',
  },
  cancelled: {
    icon: Info,
    className: 'border-amber-500/40 bg-amber-50 text-amber-900 [&>svg]:text-amber-600',
    variant: 'default' as const,
    titleKey: 'returnCancelledTitle',
    descriptionKey: 'returnCancelledDescription',
  },
  failed: {
    icon: AlertCircle,
    className: '',
    titleKey: 'returnFailedTitle',
    descriptionKey: 'returnFailedDescription',
    variant: 'destructive' as const,
  },
} as const;

type BillingStatus = keyof typeof STATUS_STYLES;

const SUCCESS_POLL_ATTEMPTS = 6;
const SUCCESS_POLL_DELAY_MS = 2500;

function isBillingStatus(value: string | null): value is BillingStatus {
  return value === 'success' || value === 'cancelled' || value === 'failed';
}

export function BillingReturnBanner() {
  const t = useTranslations('subscriptions');
  const { status: subscriptionStatus, refetch } = useSubscription();
  const searchParams = useSearchParams();
  const status = searchParams.get('billing');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const hasActiveWebpaySubscription =
    subscriptionStatus?.isPaid === true && subscriptionStatus.billingProvider === 'webpay';

  useEffect(() => {
    if (status !== 'success') {
      setIsSyncing(false);
      setIsConfirmed(false);
      return;
    }

    if (hasActiveWebpaySubscription) {
      setIsSyncing(false);
      setIsConfirmed(true);
      return;
    }

    let isCancelled = false;

    const syncSubscription = async () => {
      setIsSyncing(true);

      for (let attempt = 0; attempt < SUCCESS_POLL_ATTEMPTS; attempt += 1) {
        if (attempt > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, SUCCESS_POLL_DELAY_MS));
        }

        const nextStatus = await refetch();

        if (isCancelled) {
          return;
        }

        if (nextStatus?.isPaid && nextStatus.billingProvider === 'webpay') {
          setIsConfirmed(true);
          setIsSyncing(false);
          return;
        }
      }

      if (!isCancelled) {
        setIsSyncing(false);
      }
    };

    void syncSubscription();

    return () => {
      isCancelled = true;
    };
  }, [hasActiveWebpaySubscription, refetch, status]);

  if (!isBillingStatus(status)) {
    return null;
  }

  const config = STATUS_STYLES[status];
  const Icon = config.icon;
  const description =
    status === 'success'
      ? isConfirmed
        ? t('returnSuccessConfirmedDescription')
        : isSyncing
          ? t('returnSuccessSyncingDescription')
          : t(config.descriptionKey)
      : t(config.descriptionKey);

  return (
    <Alert variant={config.variant} className={config.className}>
      <Icon className="h-4 w-4" />
      <div>
        <AlertTitle>{t(config.titleKey)}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </div>
    </Alert>
  );
}
