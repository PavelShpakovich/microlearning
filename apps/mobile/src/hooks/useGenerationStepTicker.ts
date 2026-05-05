import { useEffect, useRef, useState } from 'react';

const DEFAULT_DELAYS_MS = [5000, 15000, 28000] as const;

export function useGenerationStepTicker(
  status: string | null | undefined,
  delaysMs: readonly number[] = DEFAULT_DELAYS_MS,
): number {
  const [stepIndex, setStepIndex] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (status !== 'pending' && status !== 'generating') {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setStepIndex(0);
      return;
    }

    setStepIndex(0);
    timersRef.current = delaysMs.map((delay, index) =>
      setTimeout(() => setStepIndex(index + 1), delay),
    );

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [delaysMs, status]);

  return stepIndex;
}
