'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_INTERVAL_MS = 4000;

/**
 * Polls a status endpoint and calls router.refresh() when status is 'ready'.
 * Handles both { status } and { report: { status } } response shapes.
 */
export function useStatusPoller(url: string, intervalMs = DEFAULT_INTERVAL_MS) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as Record<string, unknown>;
        const status =
          (data.status as string | undefined) ??
          ((data.report as Record<string, unknown> | undefined)?.status as string | undefined);

        if (status === 'ready') {
          clearInterval(id);
          router.refresh();
        } else if (status === 'error') {
          clearInterval(id);
          setFailed(true);
        }
      } catch {
        // network hiccup — retry next tick
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [url, intervalMs, router]);

  return { failed };
}
