'use client';

import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isTelegramWebApp, getTelegramWebApp } from '@/components/telegram-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AvailablePlan } from '@/app/api/profile/telegram-subscription/route';

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL;

type Plan = AvailablePlan;

interface PlanTileProps {
  plan: Plan;
  features: string[];
  isCurrent: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isRequesting: boolean;
  canUpgrade: boolean;
  onSelect: () => void;
}

function PlanTile({
  plan,
  features,
  isCurrent,
  isUpgrade,
  isDowngrade,
  isRequesting,
  canUpgrade,
  onSelect,
}: PlanTileProps) {
  const t = useTranslations();

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        isCurrent ? 'border-primary bg-primary/5' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{plan.name}</p>
          <p className="text-xs text-muted-foreground">
            {t('plans.cardsPerMonth', { count: plan.cardsPerMonth.toLocaleString() })}
          </p>
        </div>
        <p className="text-sm font-semibold shrink-0">
          {plan.starsPrice === 0 ? t('plans.free') : `${plan.starsPrice}⭐`}
        </p>
      </div>

      <ul className="space-y-1.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="w-3 h-3 shrink-0 text-primary" />
            {feature}
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <Check className="w-3.5 h-3.5" />
          {t('plans.currentPlan')}
        </div>
      ) : isUpgrade ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onSelect}
          disabled={isRequesting || !canUpgrade}
          className="w-full text-xs"
          title={!canUpgrade ? 'Open in Telegram to upgrade' : ''}
        >
          {isRequesting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <ArrowUpRight className="w-3 h-3 mr-1" />
              {t('plans.upgrade')}
            </>
          )}
        </Button>
      ) : isDowngrade ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={onSelect}
          disabled={isRequesting}
          className="w-full text-xs"
        >
          {isRequesting ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <ArrowDownLeft className="w-3 h-3 mr-1" />
              {t('plans.downgrade')}
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PlansCard
// ---------------------------------------------------------------------------

/** Plan comparison card for Settings page — shows all tiers and upgrade CTA. */
export function PlansCard() {
  const t = useTranslations();
  const tl = useTranslations('landing');
  const { status, isLoading, refetch } = useSubscription();

  const [requesting, setRequesting] = useState<string | null>(null);

  const currentPlanId = status?.planId ?? 'free';
  const plans: Plan[] = status?.availablePlans ?? [];
  const currentPlanIndex = plans.findIndex((p) => p.id === currentPlanId);

  const planFeatures: Record<string, string[]> = {
    free: [tl('plan1Feature1'), tl('plan1Feature2')],
    basic: [tl('plan2Feature1'), tl('plan2Feature2'), tl('plan2Feature3')],
    pro: [tl('plan3Feature1'), tl('plan3Feature2'), tl('plan3Feature3')],
    max: [tl('plan4Feature1'), tl('plan4Feature2'), tl('plan4Feature3')],
  };

  const handleDowngrade = async (planId: string) => {
    if (planId !== 'free') return; // Only allow downgrade to free

    setRequesting(planId);
    try {
      // Call API to cancel the current subscription and revert to free
      const response = await fetch('/api/profile/telegram-subscription', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to downgrade subscription');
      }

      toast.success(t('subscriptions.downgradeSuccess') || 'Plan downgraded to Free');
      // Trigger subscription refresh
      if (refetch) await refetch();
    } catch {
      toast.error(t('errors.generic') || 'Failed to downgrade subscription');
    } finally {
      setRequesting(null);
    }
  };

  const handlePlanSelect = async (plan: Plan) => {
    if (plan.id === 'free' && plan.id !== currentPlanId) {
      // Downgrade to free
      await handleDowngrade(plan.id);
    } else if (plan.id !== 'free' && plan.id !== currentPlanId) {
      // Upgrade: Check if in Telegram or show web warning
      if (!isTelegramWebApp()) {
        toast.error(
          t('subscriptions.telegramOnly') ||
            'Please open this app in Telegram to upgrade your plan',
        );
        return;
      }

      // In Telegram, create and open invoice
      setRequesting(plan.id);
      try {
        const starsPrice = plan.starsPrice;
        if (!starsPrice) throw new Error('Invalid plan');

        const response = await fetch('/api/telegram/invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId: plan.id, starsPrice }),
        });

        if (!response.ok) throw new Error('Failed to create invoice');

        const { invoiceLink } = await response.json();

        // Use Telegram Bot API to open invoice in Mini App
        const tg = getTelegramWebApp();
        if (tg?.openInvoice) {
          // Clear spinner before openInvoice — the call is non-blocking and
          // the sheet stays open, so we must not leave the button spinning.
          setRequesting(null);
          tg.openInvoice(invoiceLink, (status: string) => {
            if (status === 'paid') {
              toast.success(t('subscriptions.upgradeSuccess', { planName: plan.name }));
              // Give the webhook ~1.5 s to write to DB before refreshing
              setTimeout(() => {
                if (refetch) void refetch();
              }, 1500);
            } else if (status === 'cancelled') {
              toast.info(t('subscriptions.upgradeCancelled'));
            } else {
              // 'failed' or any other terminal status
              toast.error(t('subscriptions.upgradeFailed'));
            }
          });
        } else {
          window.open(invoiceLink, '_blank');
          setRequesting(null);
        }
      } catch {
        toast.error(t('errors.generic') || 'Failed to initiate payment');
        setRequesting(null);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('plans.title')}</CardTitle>
        <CardDescription>{t('plans.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {!isTelegramWebApp() && BOT_URL && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {t('subscriptions.webAppWarning')}{' '}
              <a
                href={BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 underline font-medium"
              >
                {BOT_URL.replace('https://', '')}
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plans.map((plan, idx) => (
              <PlanTile
                key={plan.id}
                plan={plan}
                features={planFeatures[plan.id] ?? []}
                isCurrent={plan.id === currentPlanId}
                isUpgrade={idx > currentPlanIndex}
                isDowngrade={idx < currentPlanIndex}
                isRequesting={requesting === plan.id}
                canUpgrade={isTelegramWebApp() || plan.id === 'free'}
                onSelect={() => handlePlanSelect(plan)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
