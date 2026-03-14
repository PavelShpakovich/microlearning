'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { LOW_CARDS_THRESHOLD } from '@/lib/constants';
import { useSubscription } from '@/hooks/use-subscription';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { areSubscriptionsEnabled, isPaidInformationVisible } from '@/lib/feature-flags';

interface UsageBannerProps {
  /** Pass live local theme count to keep banner in sync without an extra API call. */
  themesUsed?: number;
}

/** Compact warning/error banner — only renders when user is ≤ LOW_CARDS_THRESHOLD or at limit, or at/near theme limit. */
export function UsageBanner({ themesUsed: themesUsedProp }: UsageBannerProps = {}) {
  const t = useTranslations();
  const { status, isLoading } = useSubscription();

  if (isLoading || !status) return null;

  const { usage } = status;
  const isExhausted = usage.cardsRemaining === 0;
  const isLow = !isExhausted && usage.cardsRemaining <= LOW_CARDS_THRESHOLD;

  // Theme limit state (only relevant for capped plans)
  const maxThemes = status.plan.maxThemes;
  // Prefer the prop (live local count) over the stale API value
  const themesUsed = themesUsedProp ?? status.themesUsed;
  const themesRemaining = maxThemes !== null ? Math.max(0, maxThemes - themesUsed) : null;
  const isThemesExhausted = themesRemaining === 0;
  const isThemesLow = !isThemesExhausted && themesRemaining === 1;

  // Card banners take priority; theme banner only shows when card banner is silent
  const showCardBanner = isExhausted || isLow;
  const showThemeBanner = !showCardBanner && (isThemesExhausted || isThemesLow);
  const canShowUpgrade = areSubscriptionsEnabled() && isPaidInformationVisible();

  if (!showCardBanner && !showThemeBanner) return null;

  // ── Theme limit banner ──────────────────────────────────────────────────
  if (showThemeBanner) {
    return (
      <Alert
        variant={isThemesExhausted ? 'destructive' : 'default'}
        className={`mb-6 animate-in fade-in slide-in-from-top-2 duration-300 ${
          isThemesLow ? 'border-warning/40 bg-warning/5 text-warning [&>svg]:text-warning' : ''
        }`}
      >
        {isThemesExhausted ? <Lock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 w-full">
          <div>
            <AlertTitle>
              {isThemesExhausted
                ? t('usage.themeLimitReachedBannerTitle')
                : t('usage.themeNearLimitBannerTitle', { count: themesRemaining })}
            </AlertTitle>
            <AlertDescription>
              {canShowUpgrade
                ? t('usage.themeUsage', { used: themesUsed, limit: maxThemes! })
                : t('usage.futurePlansHint')}
            </AlertDescription>
          </div>
          {canShowUpgrade && (
            <Button
              asChild
              size="sm"
              variant={isThemesExhausted ? 'destructive' : 'outline'}
              className="shrink-0 h-7 text-xs"
            >
              <Link href="/settings/plan">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                {t('usage.upgradeCta')}
              </Link>
            </Button>
          )}
        </div>
      </Alert>
    );
  }

  // ── Card limit banner ───────────────────────────────────────────────────
  return (
    <Alert
      variant={isExhausted ? 'destructive' : 'default'}
      className={`mb-6 animate-in fade-in slide-in-from-top-2 duration-300 ${
        isLow ? 'border-warning/40 bg-warning/5 text-warning [&>svg]:text-warning' : ''
      }`}
    >
      {isExhausted ? <Lock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 w-full">
        <div>
          <AlertTitle>
            {isExhausted
              ? t('usage.limitReachedBannerTitle')
              : t('usage.lowCardsBannerTitle', { count: usage.cardsRemaining })}
          </AlertTitle>
          <AlertDescription>
            {canShowUpgrade
              ? t('usage.periodUsage', { generated: usage.cardsGenerated, limit: usage.cardsLimit })
              : t('usage.futurePlansHint')}
          </AlertDescription>
        </div>
        {canShowUpgrade && (
          <Button
            asChild
            size="sm"
            variant={isExhausted ? 'destructive' : 'outline'}
            className="shrink-0 h-7 text-xs"
          >
            <Link href="/settings#plan">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              {t('usage.upgradeCta')}
            </Link>
          </Button>
        )}
      </div>
    </Alert>
  );
}
