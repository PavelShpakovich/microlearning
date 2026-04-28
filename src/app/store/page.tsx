'use client';

import { useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, History, Coins, Package, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCredits } from '@/components/providers/credits-provider';

export default function StorePage() {
  const t = useTranslations('credits');
  const [isPagePending, startPageTransition] = useTransition();
  const {
    balance,
    forecastAccessUntil,
    packs,
    costs,
    transactions,
    historyPage,
    historyPageSize,
    historyTotal,
    loadStoreData,
    storeReady,
    isStoreLoading,
    isFreeProduct,
  } = useCredits();

  useEffect(() => {
    void loadStoreData({ page: 1, pageSize: 5 });
  }, [loadStoreData]);

  const totalPages = Math.max(1, Math.ceil(historyTotal / Math.max(1, historyPageSize)));
  const canGoPrev = historyPage > 1 && !isStoreLoading && !isPagePending;
  const canGoNext = historyPage < totalPages && !isStoreLoading && !isPagePending;

  const handlePageChange = (page: number) => {
    if (page === historyPage || page < 1 || page > totalPages) {
      return;
    }

    startPageTransition(() => {
      void loadStoreData({ page, pageSize: historyPageSize });
    });
  };

  const reasonLabel = (reason: string) => {
    const key = `reason${reason
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('')}` as Parameters<typeof t>[0];
    try {
      return t(key);
    } catch {
      return reason;
    }
  };

  const costItems = costs
    ? [
        {
          label: t('natalReport'),
          cost: costs.natal_report,
          isFree: isFreeProduct('natal_report'),
        },
        {
          label: t('compatibilityReport'),
          cost: costs.compatibility_report,
          isFree: isFreeProduct('compatibility_report'),
        },
        {
          label: t('forecastPack'),
          cost: costs.forecast_report,
          isFree: isFreeProduct('forecast_report'),
        },
        {
          label: t('chatPack'),
          cost: costs.follow_up_pack,
          isFree: isFreeProduct('follow_up_pack'),
        },
      ]
    : [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('storeTitle')}</h1>
        <p className="text-muted-foreground mt-1">{t('storeDescription')}</p>
      </div>

      {!storeReady ? (
        <>
          {/* Balance card skeleton */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 p-6">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 rounded-lg" />
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-12" />
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Balance card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/15">
                <Coins className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('yourBalance')}</p>
                <p className="text-3xl font-bold">
                  {balance ?? 0}{' '}
                  <span className="text-lg font-normal text-muted-foreground">
                    {t('creditsUnit')}
                  </span>
                </p>
                {forecastAccessUntil && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('forecastAccessActive', {
                      date: new Date(forecastAccessUntil).toLocaleDateString('ru-RU'),
                    })}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Credit packs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="size-5" />
                  {t('creditPacks')}
                </CardTitle>
                <CardDescription>{t('betaNote')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {packs.map((pack) => (
                  <div
                    key={pack.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-semibold">{pack.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('packCredits', { count: pack.credits })}
                      </p>
                    </div>
                    <div className="text-right">
                      {pack.priceminor !== null ? (
                        <p className="font-semibold">
                          {(pack.priceminor / 100).toFixed(2)} {pack.currency}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t('comingSoon')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Credit costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-5" />
                  {t('creditCosts')}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {costItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border px-4 py-3"
                  >
                    <span className="text-sm">{item.label}</span>
                    {item.isFree ? (
                      <span className="font-semibold text-primary">{t('freeLabel')}</span>
                    ) : (
                      <span className="font-semibold text-primary">
                        {item.cost} {t('creditsUnit')}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Transaction history */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="size-5" />
                  {t('purchaseHistory')}
                </CardTitle>

                {historyTotal > 0 ? (
                  <div className="inline-flex w-fit items-center rounded-lg border p-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(historyPage - 1)}
                      disabled={!canGoPrev}
                      aria-label={t('previousPage')}
                      className="size-8 rounded-md p-0"
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <div className="px-2 text-center text-xs font-medium text-muted-foreground">
                      {t('pageLabel', { current: historyPage, total: totalPages })}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePageChange(historyPage + 1)}
                      disabled={!canGoNext}
                      aria-label={t('nextPage')}
                      className="size-8 rounded-md p-0"
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('noTransactions')}</p>
              ) : (
                transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex flex-col gap-3 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <p className="text-sm font-medium">{reasonLabel(txn.reason)}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(txn.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      {txn.note ? (
                        <p className="mt-1 text-xs text-muted-foreground wrap-break-word">
                          {txn.note}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-semibold ${txn.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}
                      >
                        {txn.amount > 0 ? '+' : ''}
                        {txn.amount}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
