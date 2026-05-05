import { router } from 'expo-router';

export const routes = {
  tabs: {
    home: '/(tabs)',
    charts: '/(tabs)/charts',
    horoscope: '/(tabs)/horoscope',
    compatibility: '/(tabs)/compatibility',
    readings: '/(tabs)/readings',
    store: '/(tabs)/store',
    settings: '/(tabs)/settings',
  },
  store: '/(tabs)/store',
  calendar: '/calendar',
  horoscope: '/(tabs)/horoscope',
  admin: '/admin',
  charts: {
    new: '/(tabs)/charts/new',
    detail: (chartId: string) => `/(tabs)/charts/${chartId}`,
    edit: (chartId: string) => `/(tabs)/charts/edit/${chartId}`,
  },
  readings: {
    detail: (readingId: string) => `/(tabs)/readings/${readingId}`,
    tabDetail: (readingId: string) => `/(tabs)/readings/${readingId}`,
    chat: (readingId: string) => `/(tabs)/readings/chat/${readingId}`,
  },
  compatibility: {
    new: '/(tabs)/compatibility/new',
    detail: (reportId: string) => `/(tabs)/compatibility/${reportId}`,
  },
} as const;

/**
 * Navigate back reliably in Expo Router.
 *
 * Some routes can still be opened without stack history, for example when a
 * screen is reached via replace/reset semantics or from hidden tab surfaces
 * like store/calendar. This helper falls back to a known parent route when
 * there's nothing to go back to.
 */
export function goBack(fallback: string): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as never);
  }
}

export function resolveParentRoute(
  returnTo: string | string[] | undefined,
  fallback: string,
): string {
  return typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : fallback;
}

export function goBackTo(returnTo: string | string[] | undefined, fallback: string): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }

  const target = typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : fallback;
  router.replace(target as never);
}

export function goToRoute(returnTo: string | string[] | undefined, fallback: string): void {
  const target = typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : fallback;
  router.replace(target as never);
}

export function withReturnTo(pathname: string, returnTo: string): string {
  const separator = pathname.includes('?') ? '&' : '?';
  return `${pathname}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

export function push(pathname: string): void {
  router.push(pathname as never);
}

export function openStore(returnTo: string = routes.tabs.home): void {
  push(withReturnTo(routes.store, returnTo));
}

export function openCalendar(returnTo: string = routes.tabs.home): void {
  push(withReturnTo(routes.calendar, returnTo));
}

export function openHoroscope(returnTo: string = routes.tabs.home): void {
  push(withReturnTo(routes.horoscope, returnTo));
}

export function openAdmin(returnTo: string = routes.tabs.settings): void {
  push(withReturnTo(routes.admin, returnTo));
}

export function openChartsTab(): void {
  push(routes.tabs.charts);
}

export function openReadingsTab(): void {
  push(routes.tabs.readings);
}

export function openCompatibilityTab(): void {
  push(routes.tabs.compatibility);
}

export function openNewChart(returnTo: string = routes.tabs.charts): void {
  push(withReturnTo(routes.charts.new, returnTo));
}

export function openChartDetail(chartId: string, returnTo: string = routes.tabs.charts): void {
  push(withReturnTo(routes.charts.detail(chartId), returnTo));
}

export function openChartShortcut(chartId: string): void {
  openChartDetail(chartId, routes.tabs.home);
}

export function openChartEdit(
  chartId: string,
  returnTo: string = routes.charts.detail(chartId),
): void {
  push(withReturnTo(routes.charts.edit(chartId), returnTo));
}

export function openReadingDetail(
  readingId: string,
  returnTo: string = routes.tabs.readings,
): void {
  push(withReturnTo(routes.readings.detail(readingId), returnTo));
}

/** Replace current screen with reading detail (use after creation to keep clean back stack). */
export function replaceWithReadingDetail(
  readingId: string,
  returnTo: string = routes.tabs.readings,
): void {
  router.replace(withReturnTo(routes.readings.detail(readingId), returnTo) as never);
}

export function openReadingShortcut(readingId: string): void {
  openReadingDetail(readingId, routes.tabs.home);
}

export function openReadingChat(
  readingId: string,
  returnTo: string = routes.readings.tabDetail(readingId),
): void {
  push(withReturnTo(routes.readings.chat(readingId), returnTo));
}

export function openCompatibilityNew(
  returnTo: string = routes.tabs.compatibility,
  primaryChartId?: string,
): void {
  const pathname = primaryChartId
    ? `${routes.compatibility.new}?primaryChartId=${encodeURIComponent(primaryChartId)}`
    : routes.compatibility.new;
  push(withReturnTo(pathname, returnTo));
}

export function openCompatibilityDetail(
  reportId: string,
  returnTo: string = routes.tabs.compatibility,
): void {
  push(withReturnTo(routes.compatibility.detail(reportId), returnTo));
}

/** Replace current screen with compatibility detail (use after creation to keep clean back stack). */
export function replaceWithCompatibilityDetail(
  reportId: string,
  returnTo: string = routes.tabs.compatibility,
): void {
  router.replace(withReturnTo(routes.compatibility.detail(reportId), returnTo) as never);
}
