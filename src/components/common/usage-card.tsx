'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSubscription } from '@/hooks/use-subscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// ---------------------------------------------------------------------------
// Atoms
// ---------------------------------------------------------------------------

function UsageProgressBar({ pct }: { pct: number }) {
  // Determine color based on percentage
  const getBarColor = () => {
    if (pct >= 100) return 'bg-destructive';
    if (pct >= 85) return 'bg-warning';
    if (pct >= 60) return 'bg-orange-500';
    return 'bg-primary';
  };

  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={`h-full transition-[width] duration-500 ${getBarColor()}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// UsageCard
// ---------------------------------------------------------------------------

/** Full usage card for Settings page — always shown. */
export function UsageCard() {
  const t = useTranslations();
  const locale = useLocale();
  const { status, isLoading } = useSubscription();

  const pct =
    status && status.usage.cardsLimit > 0
      ? Math.min(100, (status.usage.cardsGenerated / status.usage.cardsLimit) * 100)
      : 0;

  const isExhausted = status?.usage.cardsRemaining === 0;

  const planNames: Record<string, string> = {
    free: t('landing.plan1Name'),
    basic: t('landing.plan2Name'),
    pro: t('landing.plan3Name'),
    max: t('landing.plan4Name'),
  };

  const planName = status
    ? (planNames[status.plan.planId] ??
      status.plan.planId.charAt(0).toUpperCase() + status.plan.planId.slice(1))
    : null;

  const periodEnd = status
    ? new Date(status.usage.periodEnd).toLocaleDateString(locale, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <Card id="plan">
      <CardHeader>
        <CardTitle>{t('usage.cardTitle')}</CardTitle>
        <CardDescription>{t('usage.cardDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !status ? (
          <div className="h-4 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t('usage.planLabel', { plan: planName ?? '' })}
              </span>
              <span
                className={`font-medium tabular-nums ${
                  pct >= 100
                    ? 'text-destructive'
                    : pct >= 85
                      ? 'text-warning'
                      : pct >= 60
                        ? 'text-orange-500'
                        : 'text-foreground'
                }`}
              >
                {t('usage.cardsCounter', {
                  generated: status.usage.cardsGenerated,
                  limit: status.usage.cardsLimit,
                })}
              </span>
            </div>

            <UsageProgressBar pct={pct} />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {isExhausted
                  ? t('usage.noCardsLeft')
                  : t('usage.cardsLeft', { count: status.usage.cardsRemaining })}
              </span>
              {periodEnd && <span>{t('usage.periodRenews', { date: periodEnd })}</span>}
            </div>

            {isExhausted && (
              <p className="text-xs text-muted-foreground border border-border rounded-lg px-3 py-2 bg-muted/50">
                {t('usage.exhaustedHint')}
              </p>
            )}

            {/* ── Theme usage (only for plans with a theme cap) ── */}
            {status.plan.maxThemes !== null &&
              (() => {
                const themesUsed = status.themesUsed;
                const maxThemes = status.plan.maxThemes;
                const themesPct = Math.min(100, (themesUsed / maxThemes) * 100);
                const themesRemaining = Math.max(0, maxThemes - themesUsed);
                const isThemesExhausted = themesRemaining === 0;
                return (
                  <>
                    <div className="border-t border-border" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {t('usage.themeUsage', { used: themesUsed, limit: maxThemes })}
                      </span>
                      <span
                        className={`font-medium tabular-nums ${
                          themesPct >= 100
                            ? 'text-destructive'
                            : themesPct >= 80
                              ? 'text-warning'
                              : 'text-foreground'
                        }`}
                      >
                        {t('usage.themesCounter', { used: themesUsed, limit: maxThemes })}
                      </span>
                    </div>
                    <UsageProgressBar pct={themesPct} />
                    <div className="text-xs text-muted-foreground">
                      {isThemesExhausted
                        ? t('usage.noThemesLeft')
                        : t('usage.themesLeft', { count: themesRemaining })}
                    </div>
                  </>
                );
              })()}
          </>
        )}
      </CardContent>
    </Card>
  );
}
