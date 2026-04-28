'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ReadingRow {
  id: string;
  title: string;
  reading_type: string;
  status: string;
  created_at: string;
  summary: string | null;
}

interface LinkedReadingsProps {
  chartId: string;
  initialReadings: ReadingRow[];
  initialTotal: number;
  pageSize?: number;
}

export default function LinkedReadings({
  chartId,
  initialReadings,
  initialTotal,
  pageSize = 5,
}: LinkedReadingsProps) {
  const t = useTranslations('chartDetail');
  const [isPending, startTransition] = useTransition();
  const [readings, setReadings] = useState<ReadingRow[]>(initialReadings);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(initialTotal);
  const [loading, setLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canPrev = page > 1 && !loading && !isPending;
  const canNext = page < totalPages && !loading && !isPending;

  async function load(p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/charts/${chartId}/readings?page=${p}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as { readings: ReadingRow[]; total: number; page: number };
      setReadings(data.readings ?? []);
      setTotal(data.total ?? 0);
      setPage(data.page ?? p);
    } finally {
      setLoading(false);
    }
  }

  const handlePageChange = (p: number) => {
    if (p === page || p < 1 || p > totalPages) return;
    startTransition(() => void load(p));
  };

  return (
    <div>
      {readings.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">{t('noReadingsYet')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('noReadingsHint')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {readings.map((reading) => (
            <Link
              key={reading.id}
              href={`/readings/${reading.id}`}
              className="group rounded-xl border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold group-hover:text-primary">
                    {reading.title}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {t(`readingTypes.${reading.reading_type}` as Parameters<typeof t>[0]) ??
                      String(reading.reading_type).replace(/_/g, ' ')}{' '}
                    · {new Date(reading.created_at).toLocaleDateString()}
                  </p>
                  {reading.summary ? (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {reading.summary}
                    </p>
                  ) : null}
                </div>
                {reading.status !== 'ready' ? (
                  <Badge
                    variant={reading.status === 'error' ? 'destructive' : 'outline'}
                    className="shrink-0"
                  >
                    {reading.status === 'error' ? t('statusError') : t('statusPending')}
                  </Badge>
                ) : null}
              </div>
            </Link>
          ))}

          {totalPages > 1 ? (
            <div className="inline-flex w-fit items-center rounded-lg border p-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={!canPrev}
                aria-label={t('previousPage')}
                className="size-8 rounded-md p-0"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <div className="px-2 text-center text-xs font-medium text-muted-foreground">
                {t('pageLabel', { current: page, total: totalPages })}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={!canNext}
                aria-label={t('nextPage')}
                className="size-8 rounded-md p-0"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
