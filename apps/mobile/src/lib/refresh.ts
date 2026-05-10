import { createElement, useCallback, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useColors } from '@/lib/colors';

interface AppRefreshControlProps {
  refreshing: boolean;
  onRefresh: () => void | Promise<void>;
  progressViewOffset?: number;
}

export function AppRefreshControl({
  refreshing,
  onRefresh,
  progressViewOffset = 0,
}: AppRefreshControlProps) {
  const colors = useColors();

  return createElement(RefreshControl, {
    refreshing,
    onRefresh,
    tintColor: colors.primary,
    colors: [colors.primary],
    progressBackgroundColor: colors.card,
    progressViewOffset,
  });
}

export function usePullToRefresh(onRefresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const refreshInFlightRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    setRefreshing(true);

    try {
      await onRefresh();
    } finally {
      refreshInFlightRef.current = false;
      setRefreshing(false);
    }
  }, [onRefresh]);

  return { refreshing, handleRefresh };
}
