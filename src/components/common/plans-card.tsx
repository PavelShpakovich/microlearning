'use client';

import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/use-subscription';
import { profileApi } from '@/services/profile-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Plan data
// ---------------------------------------------------------------------------

const PLANS = [
  { id: 'free', name: 'Free', cards: 20, priceMonthly: 0 },
  { id: 'basic', name: 'Basic', cards: 200, priceMonthly: 4.99 },
  { id: 'pro', name: 'Pro', cards: 1000, priceMonthly: 12.99 },
  { id: 'unlimited', name: 'Unlimited', cards: 5000, priceMonthly: 24.99 },
] as const;

type Plan = (typeof PLANS)[number];

// ---------------------------------------------------------------------------
// PlanTile atom
// ---------------------------------------------------------------------------

interface PlanTileProps {
  plan: Plan;
  isCurrent: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isRequesting: boolean;
  onUpgrade: (planId: string) => void;
  onDowngrade: (planId: string) => void;
}

function PlanTile({
  plan,
  isCurrent,
  isUpgrade,
  isDowngrade,
  isRequesting,
  onUpgrade,
  onDowngrade,
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
          {plan.priceMonthly === 0 ? t('plans.free') : `$${plan.priceMonthly.toFixed(2)}/mo`}
        </p>
      </div>

      {isCurrent ? (
        <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
          <Check className="w-3.5 h-3.5" />
          {t('plans.currentPlan')}
        </div>
      ) : isUpgrade ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onUpgrade(plan.id)}
          disabled={isRequesting}
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
      ) : isDowngrade ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDowngrade(plan.id)}
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
  const { status, isLoading } = useSubscription();
  const [requesting, setRequesting] = useState<string | null>(null);

  const currentPlanId = status?.plan.planId ?? 'free';
  const currentPlanIndex = PLANS.findIndex((p) => p.id === currentPlanId);

  const handleUpgrade = async (planId: string) => {
    setRequesting(planId);
    try {
      const data = await profileApi.requestUpgrade(planId);
      toast.info(t('plans.upgradeRequestSent', { email: data.supportEmail }));
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setRequesting(null);
    }
  };

  const handleDowngrade = async (planId: string) => {
    setRequesting(planId);
    try {
      const data = await profileApi.requestUpgrade(planId);
      toast.info(t('plans.downgradeRequestSent', { email: data.supportEmail }));
    } catch {
      toast.error(t('errors.generic'));
    } finally {
      setRequesting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('plans.title')}</CardTitle>
        <CardDescription>{t('plans.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PLANS.map((plan, idx) => (
              <PlanTile
                key={plan.id}
                plan={plan}
                isCurrent={plan.id === currentPlanId}
                isUpgrade={idx > currentPlanIndex}
                isDowngrade={idx < currentPlanIndex}
                isRequesting={requesting === plan.id}
                onUpgrade={(id) => void handleUpgrade(id)}
                onDowngrade={(id) => void handleDowngrade(id)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
