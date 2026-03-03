'use client';

import { useEffect, useRef, useState } from 'react';

interface UseIntersectionOptions {
  threshold?: number | number[];
  rootMargin?: string;
}

/**
 * Hook for observing element visibility using IntersectionObserver
 * Much more efficient than polling the DOM with setInterval
 *
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * const isVisible = useIntersection(ref, { threshold: 0.8 });
 *
 * useEffect(() => {
 *   if (isVisible) {
 *     markCardSeen(cardId);
 *   }
 * }, [isVisible]);
 *
 * return <div ref={ref}>Content</div>;
 */
export function useIntersection(
  ref: React.RefObject<HTMLElement>,
  options: UseIntersectionOptions = {},
) {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Create observer
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: options.threshold ?? 0.5,
        rootMargin: options.rootMargin ?? '0px',
      },
    );

    // Start observing
    observerRef.current.observe(ref.current);

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [ref, options]);

  return isVisible;
}

/**
 * Hook to batch multiple intersection observations
 * More efficient than creating multiple observers
 *
 * @example
 * const containerRef = useRef<HTMLDivElement>(null);
 * const visibleCards = useIntersectionBatch(containerRef, '[data-card-id]', { threshold: 0.8 });
 *
 * useEffect(() => {
 *   visibleCards.forEach(cardId => markCardSeen(cardId));
 * }, [visibleCards]);
 */
export function useIntersectionBatch(
  containerRef: React.RefObject<HTMLElement>,
  selector: string,
  options: UseIntersectionOptions = {},
) {
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleIds((prev) => {
          const updated = new Set(prev);
          entries.forEach((entry) => {
            const id = (entry.target as HTMLElement).dataset.cardId;
            if (!id) return;

            if (entry.isIntersecting) {
              updated.add(id);
            } else {
              updated.delete(id);
            }
          });
          return updated;
        });
      },
      {
        threshold: options.threshold ?? 0.5,
        root: containerRef.current,
        rootMargin: options.rootMargin ?? '0px',
      },
    );

    // Start observing all matching elements
    const elements = containerRef.current.querySelectorAll(selector);
    elements.forEach((el) => observerRef.current?.observe(el));

    // Cleanup
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [containerRef, selector, options]);

  return Array.from(visibleIds);
}
