'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CreateReadingButtonProps {
  chartId: string;
  readingType?:
    | 'natal_overview'
    | 'personality'
    | 'love'
    | 'career'
    | 'strengths'
    | 'transit'
    | 'compatibility';
}

export function CreateReadingButton({
  chartId,
  readingType = 'natal_overview',
}: CreateReadingButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const createReading = () => {
    startTransition(async () => {
      try {
        const response = await fetch('/api/readings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chartId, readingType, locale: 'ru' }),
        });

        const data = (await response.json()) as { error?: string; reading?: { id: string } };

        if (!response.ok || !data.reading) {
          throw new Error(data.error || 'Не удалось создать разбор');
        }

        toast.success('Разбор создан');
        router.push('/readings');
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Не удалось создать разбор');
      }
    });
  };

  return (
    <Button onClick={createReading} disabled={isPending}>
      {isPending ? 'Создаём разбор...' : 'Создать натальный разбор'}
    </Button>
  );
}
