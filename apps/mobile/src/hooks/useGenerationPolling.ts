import { useEffect, useRef } from 'react';

type GenerationStatus = 'pending' | 'generating' | 'ready' | 'error' | string;

interface GenerationPollingItem {
  status: GenerationStatus;
}

interface UseGenerationPollingOptions<TItem extends GenerationPollingItem> {
  entityId: string | undefined;
  currentItem: TItem | null;
  fetchLatest: () => Promise<TItem>;
  onUpdate: (item: TItem) => void;
  startGeneration?: () => Promise<unknown>;
  onReady?: (item: TItem, wasGenerating: boolean) => void;
  pollIntervalMs?: number;
}

export function useGenerationPolling<TItem extends GenerationPollingItem>({
  entityId,
  currentItem,
  fetchLatest,
  onUpdate,
  startGeneration,
  onReady,
  pollIntervalMs = 3000,
}: UseGenerationPollingOptions<TItem>): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousStatusRef = useRef<GenerationStatus | null>(null);

  useEffect(() => {
    if (!entityId || !currentItem) {
      return;
    }

    const { status } = currentItem;
    previousStatusRef.current = status;

    if (status !== 'pending' && status !== 'generating') {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (status === 'pending') {
      void startGeneration?.().catch(() => {});
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      try {
        const updated = await fetchLatest();
        const wasGenerating =
          previousStatusRef.current === 'pending' || previousStatusRef.current === 'generating';

        previousStatusRef.current = updated.status;
        onUpdate(updated);

        if (updated.status === 'ready') {
          onReady?.(updated, wasGenerating);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else if (updated.status === 'error') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // Ignore transient network failures; the next tick will retry.
      }
    }, pollIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentItem, entityId, fetchLatest, onReady, onUpdate, pollIntervalMs, startGeneration]);
}
