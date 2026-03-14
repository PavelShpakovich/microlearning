'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Loader2 } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { subscriptionApi } from '@/services/subscription-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { AvailablePlan } from '@/lib/billing/subscription-types';

type Plan = AvailablePlan;

interface PlanTileProps {
  plan: Plan;
  features: string[];
  isCurrent: boolean;
  isUpgrade: boolean;
  isRequesting: boolean;
  canUpgrade: boolean;
  isCancelled: boolean;
  expiresAt: string | null;
  onSelect: () => void;
  showPrices: boolean;
}

function PlanTile({
  plan,
  features,
  isCurrent,
  isUpgrade,
  isRequesting,
  canUpgrade,
  isCancelled,
  expiresAt,
  onSelect,
  showPrices,
}: PlanTileProps) {
  const t = useTranslations();
  const locale = useLocale();

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
        {showPrices && (
          <p className="text-sm font-semibold shrink-0">
            {plan.priceMinor === 0 || plan.priceMinor == null
              ? t('plans.free')
              : `${(plan.priceMinor / 100).toFixed(2)} ${plan.currency}`}
          </p>
        )}
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
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <Check className="w-3.5 h-3.5" />
            {t('plans.currentPlan')}
          </div>
          {isCancelled && expiresAt && (
            <p className="text-xs text-muted-foreground">
              {t('subscriptions.activeUntil', {
                date: new Date(expiresAt).toLocaleDateString(locale, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                }),
              })}
            </p>
          )}
          {/* Cancel / re-enable renewal button on the current paid plan tile */}
          {plan.id !== 'free' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onSelect}
              disabled={isRequesting}
              className="w-full text-xs"
            >
              {isRequesting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : isCancelled ? (
                <>
                  <ArrowUpRight className="w-3 h-3 mr-1" />
                  {t('subscriptions.reEnableRenewal')}
                </>
              ) : (
                <>
                  <ArrowDownLeft className="w-3 h-3 mr-1" />
                  {t('plans.cancelRenewal')}
                </>
              )}
            </Button>
          )}
        </div>
      ) : isUpgrade ? (
        <Button
          size="sm"
          variant="outline"
          onClick={onSelect}
          disabled={isRequesting || !canUpgrade}
          className="w-full text-xs"
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
  const billingEnabled = status?.billingEnabled ?? false;
  const paidInfoVisible = status?.paidInfoVisible ?? false;

  const planFeatures: Record<string, string[]> = {
    free: [tl('plan1Feature1'), tl('plan1Feature2')],
    basic: [tl('plan2Feature1'), tl('plan2Feature2'), tl('plan2Feature3')],
    pro: [tl('plan3Feature1'), tl('plan3Feature2'), tl('plan3Feature3')],
    max: [tl('plan4Feature1'), tl('plan4Feature2'), tl('plan4Feature3')],
  };

  const handleCancelRenewal = async () => {
    setRequesting(currentPlanId);
    try {
      await subscriptionApi.cancelRenewal();
      toast.success(t('subscriptions.cancelSuccess'));
      await refetch();
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setRequesting(null);
    }
  };

  const handleReEnableRenewal = async () => {
    setRequesting(currentPlanId);
    try {
      await subscriptionApi.reEnableRenewal();
      toast.success(t('subscriptions.reEnableSuccess'));
      await refetch();
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setRequesting(null);
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!billingEnabled) {
      toast.error(t('subscriptions.unavailable'));
      return;
    }

    setRequesting(plan.id);
    try {
      const result = await subscriptionApi.createCheckout(plan.id);
      if (result.url) {
        if (result.method === 'POST' && result.fields) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = result.url;
          form.style.display = 'none';

          for (const [key, value] of Object.entries(result.fields)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = value;
            form.appendChild(input);
          }

          document.body.appendChild(form);
          form.submit();
          return;
        }

        window.location.href = result.url;
        return;
      }
      toast.info(result.message ?? t('subscriptions.unavailable'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('errors.generic'));
      setRequesting(null);
      return;
    }
    setRequesting(null);
  };

  const isCancelled = (status?.isPaid && !status?.autoRenew) ?? false;

  const handlePlanAction = (plan: Plan) => {
    if (plan.id === currentPlanId && plan.id !== 'free') {
      if (isCancelled) {
        void handleReEnableRenewal();
      } else {
        void handleCancelRenewal();
      }
    } else if (plan.id !== currentPlanId && plan.id !== 'free') {
      void handleUpgrade(plan);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('plans.title')}</CardTitle>
        <CardDescription>
          {billingEnabled ? t('plans.description') : t('subscriptions.unavailableDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!billingEnabled && (
          <Alert className="mb-4">
            <AlertDescription>{t('subscriptions.unavailableDescription')}</AlertDescription>
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
                isRequesting={requesting === plan.id}
                canUpgrade={billingEnabled && plan.checkoutEnabled}
                isCancelled={isCancelled}
                expiresAt={status?.expiresAt ?? null}
                onSelect={() => handlePlanAction(plan)}
                showPrices={paidInfoVisible}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
