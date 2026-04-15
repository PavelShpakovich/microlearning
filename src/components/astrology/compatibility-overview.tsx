'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { Heart, Plus, Trash2 } from 'lucide-react';

export interface CompatibilityReportRecord {
  id: string;
  status: string;
  summary: string | null;
  created_at: string;
  primary_chart_id: string;
  secondary_chart_id: string;
}

export interface ChartStub {
  id: string;
  label: string;
  person_name: string;
}

interface CompatibilityOverviewProps {
  reports: CompatibilityReportRecord[];
  chartMap: Record<string, ChartStub>;
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('compatibility');
  if (status === 'ready') return null;
  if (status === 'error') {
    return <Badge variant="destructive">{t('statusError')}</Badge>;
  }
  return (
    <Badge variant="secondary">
      {status === 'generating' ? t('statusGenerating') : t('statusPending')}
    </Badge>
  );
}

export function CompatibilityOverview({
  reports: initialReports,
  chartMap,
}: CompatibilityOverviewProps) {
  const t = useTranslations('compatibility');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [reports, setReports] = useState(initialReports);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pendingReport = reports.find((r) => r.id === deleteId);
  const pendingTitle = pendingReport
    ? `${chartMap[pendingReport.primary_chart_id]?.person_name ?? '?'} и ${chartMap[pendingReport.secondary_chart_id]?.person_name ?? '?'}`
    : '';

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/compatibility/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setReports((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success(t('deleteSuccess'));
      router.refresh();
    } catch {
      toast.error(t('deleteFailed'));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            {t('sectionLabel')}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t('heading')}</h1>
          <p className="max-w-xl text-sm text-muted-foreground">{t('description')}</p>
        </div>
        <Button asChild>
          <Link href="/compatibility/new">
            <Plus className="mr-2 size-4" />
            {t('newReport')}
          </Link>
        </Button>
      </section>

      {reports.length === 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Heart className="size-5 text-muted-foreground" />
              <CardTitle>{t('emptyTitle')}</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button asChild>
              <Link href="/compatibility/new">{t('createReport')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/charts">{t('goToCharts')}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => {
            const primary = chartMap[report.primary_chart_id];
            const secondary = chartMap[report.secondary_chart_id];
            const title = `${primary?.person_name ?? '?'} и ${secondary?.person_name ?? '?'}`;
            return (
              <Card
                key={report.id}
                className="group relative transition-colors hover:border-primary/50"
              >
                <Link href={`/compatibility/${report.id}`} className="absolute inset-0 z-0" />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Heart className="size-3.5 text-primary" />
                    {t('synastryLabel')}
                  </div>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={report.status} />
                      <span>{new Date(report.created_at).toLocaleDateString('ru')}</span>
                    </div>
                    <div className="relative z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteId(report.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  {report.summary ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {report.summary}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmationDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
        }}
        onConfirm={() => void handleDelete()}
        title={t('deleteTitle')}
        description={pendingTitle ? t('confirmDelete', { title: pendingTitle }) : t('deleteTitle')}
        confirmLabel={deleting ? '…' : t('deleteTitle')}
        cancelLabel={tCommon('cancel')}
        disabled={deleting}
      />
    </main>
  );
}
