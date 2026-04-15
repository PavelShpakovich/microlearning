'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmationDialog } from '@/components/common/confirmation-dialog';
import { Trash2, Sparkles, Search } from 'lucide-react';
import { READING_TYPES } from '@/lib/astrology/constants';
import type { Tables } from '@/lib/supabase/types';

type ReadingRow = Tables<'readings'>;

interface ReadingsListProps {
  initialReadings: ReadingRow[];
}

export function ReadingsList({ initialReadings }: ReadingsListProps) {
  const t = useTranslations('readingsPage');
  const tCommon = useTranslations('common');
  const [readings, setReadings] = useState(initialReadings);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const pendingReading = readings.find((r) => r.id === deleteId);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return readings.filter((r) => {
      const matchesSearch = !q || r.title.toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || r.reading_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [readings, search, typeFilter]);

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/readings/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setReadings((prev) => prev.filter((r) => r.id !== deleteId));
      toast.success(t('deleteReadingSuccess'));
    } catch {
      toast.error(t('deleteReadingFailed'));
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  }

  function getTypeLabel(type: string) {
    const key = `readingTypes.${type}` as Parameters<typeof t>[0];
    return t(key) ?? type;
  }

  function getStatusLabel(status: string) {
    if (status === 'ready') return t('statusReady');
    if (status === 'error') return t('statusError');
    if (status === 'generating') return t('statusGenerating');
    return t('statusPending');
  }

  return (
    <>
      {/* Search & filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t('filterByType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('filterAll')}</SelectItem>
            {READING_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`readingTypes.${type}` as Parameters<typeof t>[0]) ?? type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('noResults')}</p>
      ) : null}

      <div className="flex flex-col gap-3">
        {filtered.map((reading) => (
          <Card key={reading.id} className="relative transition-colors hover:border-primary/50">
            <Link href={`/readings/${reading.id}`} className="absolute inset-0 z-0" />
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-primary" />
                {getTypeLabel(reading.reading_type)}
              </CardDescription>
              <CardTitle className="text-base">{reading.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {reading.summary ? (
                <p className="line-clamp-2 text-muted-foreground">{reading.summary}</p>
              ) : null}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  {reading.status !== 'ready' ? (
                    <Badge variant={reading.status === 'error' ? 'destructive' : 'outline'}>
                      {getStatusLabel(reading.status)}
                    </Badge>
                  ) : null}
                  <span>{new Date(reading.created_at).toLocaleDateString()}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative z-10 size-10 text-muted-foreground hover:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    setDeleteId(reading.id);
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmationDialog
        open={deleteId !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setDeleteId(null);
        }}
        onConfirm={() => void handleDelete()}
        title={t('deleteReading')}
        description={
          pendingReading
            ? t('confirmDeleteReading', { title: pendingReading.title })
            : t('deleteReading')
        }
        confirmLabel={deleting ? '…' : t('deleteReading')}
        cancelLabel={tCommon('cancel')}
        disabled={deleting}
      />
    </>
  );
}
