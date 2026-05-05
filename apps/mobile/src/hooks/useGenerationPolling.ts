import { useEffect, useRef } from 'react';

const DEFAULT_GENERATION_STALL_TIMEOUT_MS = 150000;

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
  stallTimeoutMs?: number;
  maxConsecutiveFailures?: number;
  onGenerationIssue?: () => void;
}

export function useGenerationPolling<TItem extends GenerationPollingItem>({
  entityId,
  currentItem,
  fetchLatest,
  onUpdate,
  startGeneration,
  onReady,
  pollIntervalMs = 3000,
  stallTimeoutMs = DEFAULT_GENERATION_STALL_TIMEOUT_MS,
  maxConsecutiveFailures = 3,
  onGenerationIssue,
}: UseGenerationPollingOptions<TItem>): void {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousStatusRef = useRef<GenerationStatus | null>(null);
  const generationStartedAtRef = useRef<number | null>(null);
  const consecutiveFailuresRef = useRef(0);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleGenerationIssue = () => {
    stopPolling();
    generationStartedAtRef.current = null;
    consecutiveFailuresRef.current = 0;
    onGenerationIssue?.();
  };

  useEffect(() => {
    if (!entityId || !currentItem) {
      generationStartedAtRef.current = null;
      consecutiveFailuresRef.current = 0;
      return;
    }

    const { status } = currentItem;
    previousStatusRef.current = status;

    if (status !== 'pending' && status !== 'generating') {
      generationStartedAtRef.current = null;
      consecutiveFailuresRef.current = 0;
      stopPolling();
      return;
    }

    if (generationStartedAtRef.current === null) {
      generationStartedAtRef.current = Date.now();
    }

    if (status === 'pending') {
      void startGeneration?.().catch(() => {
        handleGenerationIssue();
      });
    }

    stopPolling();

    intervalRef.current = setInterval(async () => {
      const startedAt = generationStartedAtRef.current;
      if (startedAt !== null && Date.now() - startedAt >= stallTimeoutMs) {
        handleGenerationIssue();
        return;
      }

      try {
        const updated = await fetchLatest();
        const wasGenerating =
          previousStatusRef.current === 'pending' || previousStatusRef.current === 'generating';

        consecutiveFailuresRef.current = 0;
        previousStatusRef.current = updated.status;
        onUpdate(updated);

        if (updated.status === 'ready') {
          onReady?.(updated, wasGenerating);
          generationStartedAtRef.current = null;
          stopPolling();
        } else if (updated.status === 'error') {
          generationStartedAtRef.current = null;
          stopPolling();
        }
      } catch {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= maxConsecutiveFailures) {
          handleGenerationIssue();
        }
      }
    }, pollIntervalMs);

    return () => {
      stopPolling();
    };
  }, [
    currentItem,
    entityId,
    fetchLatest,
    maxConsecutiveFailures,
    onGenerationIssue,
    onReady,
    onUpdate,
    pollIntervalMs,
    stallTimeoutMs,
    startGeneration,
  ]);
}
