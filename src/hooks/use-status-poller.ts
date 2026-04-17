'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const DEFAULT_INTERVAL_MS = 4000;

/**
 * Polls a status endpoint and navigates to the current page when status is 'ready'.
 * Uses router.replace(pathname) instead of router.refresh() for reliable page updates.
 * Handles both { status } and { report: { status } } response shapes.
 */
export function useStatusPoller(url: string, intervalMs = DEFAULT_INTERVAL_MS) {
  const router = useRouter();
  const pathname = usePathname();
  const [failed, setFailed] = useState(false);

  // Keep the latest navigate function in a ref so the interval closure
  // always has the current pathname without needing to be recreated.
  const navigateRef = useRef(() => router.replace(pathname));
  useEffect(() => {
    navigateRef.current = () => router.replace(pathname);
  }, [router, pathname]);

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
          navigateRef.current();
        } else if (status === 'error') {
          clearInterval(id);
          setFailed(true);
        }
      } catch {
        // network hiccup — retry next tick
      }
    }, intervalMs);

    return () => clearInterval(id);
  }, [url, intervalMs]); // interval no longer depends on router/pathname — the ref handles it

  return { failed };
}
