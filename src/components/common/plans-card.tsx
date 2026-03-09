'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Loader2, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { isTelegramWebApp, getTelegramWebApp } from '@/components/telegram-provider';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Stars prices for each plan (roughly aligned to current USD rates)
// These should be kept in sync with env vars: TELEGRAM_STARS_PRICE_*
const PLANS = [
  { id: 'free', name: 'Free', cards: 50, starsPrice: 0 },
  { id: 'basic', name: 'Starter', cards: 300, starsPrice: 400 }, // ~$5.20
  { id: 'pro', name: 'Pro', cards: 2000, starsPrice: 1000 }, // ~$13
  { id: 'max', name: 'Max', cards: 5000, starsPrice: 2000 }, // ~$26
] as const;

type Plan = (typeof PLANS)[number];

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
            {t('plans.cardsPerMonth', { count: plan.cards.toLocaleString() })}
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
  const currentPlanIndex = PLANS.findIndex((p) => p.id === currentPlanId);

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
    } catch (error) {
      toast.error(t('errors.generic') || 'Failed to downgrade subscription');
    } finally {
      setRequesting(null);
    }
  };

  const handlePlanSelect = async (plan: (typeof PLANS)[number]) => {
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
        const starsPrice = [
          { id: 'basic', price: 400 },
          { id: 'pro', price: 1000 },
          { id: 'max', price: 2000 },
        ].find((p) => p.id === plan.id)?.price;

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
          tg.openInvoice(invoiceLink, (status: string) => {
            if (status === 'paid') {
              toast.success(t('subscriptions.upgradeSuccess') || 'Plan upgraded successfully!');
              if (refetch) refetch();
            } else if (status === 'cancelled') {
              toast.info(t('subscriptions.upgradeCancelled') || 'Payment cancelled');
            }
          });
        } else {
          window.open(invoiceLink, '_blank');
        }
      } catch {
        toast.error(t('errors.generic') || 'Failed to initiate payment');
      } finally {
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
        {!isTelegramWebApp() && (
          <Alert className="mb-4 border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              {t('subscriptions.webAppWarning') ||
                'To upgrade your plan, please open this app on your Telegram account using the bot.'}
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLANS.map((plan, idx) => (
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
