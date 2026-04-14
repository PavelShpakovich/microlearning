'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUiLanguage } from '@/hooks/use-ui-language';

const READING_TYPES = [
  'natal_overview',
  'personality',
  'love',
  'career',
  'strengths',
  'finance',
  'health',
] as const;

type ReadingType = (typeof READING_TYPES)[number];

interface CreateReadingButtonProps {
  chartId: string;
}

export function CreateReadingButton({ chartId }: CreateReadingButtonProps) {
  const router = useRouter();
  const t = useTranslations('createReading');
  const { locale } = useUiLanguage();
  const [isPending, startTransition] = useTransition();
  const [activeType, setActiveType] = useState<ReadingType | null>(null);

  const createReading = (readingType: ReadingType) => {
    setActiveType(readingType);
    startTransition(async () => {
      try {
        const response = await fetch('/api/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chartId, readingType, locale }),
        });

        const data = (await response.json()) as { error?: string; reading?: { id: string } };

        if (!response.ok || !data.reading) {
          throw new Error(data.error || t('error'));
        }

        toast.success(t('success'));
        router.push(`/readings/${data.reading.id}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : t('error'));
      } finally {
        setActiveType(null);
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button disabled={isPending}>{isPending ? t('submitting') : t('submit')}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {READING_TYPES.map((type) => (
          <DropdownMenuItem key={type} disabled={isPending} onClick={() => createReading(type)}>
            {t(`type_${type}`)}
            {activeType === type && isPending ? (
              <span className="ml-2 text-xs text-muted-foreground">…</span>
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
