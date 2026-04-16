'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HoroscopeRegenerateProps {
  forecastId: string;
}

export function HoroscopeRegenerate({ forecastId }: HoroscopeRegenerateProps) {
  const t = useTranslations('horoscope');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleRegenerate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/forecasts/${forecastId}/regenerate`, { method: 'POST' });
      if (!res.ok) throw new Error('regeneration failed');
      // Server will see null content → render HoroscopeGenerating
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={loading}>
      <RefreshCw className={`size-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
      {loading ? t('regenerating') : t('regenerate')}
    </Button>
  );
}
