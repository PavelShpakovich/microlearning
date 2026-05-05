import type { CompatibilityReport, ReadingDetail } from '@clario/api-client';

// Module-level one-shot caches so detail screens can render immediately
// after creation without waiting for a round-trip API fetch.
// Each value is consumed once and then cleared.

let pendingCompatibilityReport: CompatibilityReport | null = null;
let pendingReading: ReadingDetail | null = null;

// Refresh flags: set when a new item is created so the list screen reloads on next focus.
let compatibilityListNeedsRefresh = false;
let readingsListNeedsRefresh = false;

export function markCompatibilityListNeedsRefresh(): void {
  compatibilityListNeedsRefresh = true;
}

export function consumeCompatibilityListRefresh(): boolean {
  if (compatibilityListNeedsRefresh) {
    compatibilityListNeedsRefresh = false;
    return true;
  }
  return false;
}

export function markReadingsListNeedsRefresh(): void {
  readingsListNeedsRefresh = true;
}

export function consumeReadingsListRefresh(): boolean {
  if (readingsListNeedsRefresh) {
    readingsListNeedsRefresh = false;
    return true;
  }
  return false;
}

export function cacheCompatibilityReport(report: CompatibilityReport): void {
  pendingCompatibilityReport = report;
}

export function consumeCompatibilityReport(id: string): CompatibilityReport | null {
  if (pendingCompatibilityReport?.id === id) {
    const r = pendingCompatibilityReport;
    pendingCompatibilityReport = null;
    return r;
  }
  return null;
}

export function cacheReading(reading: ReadingDetail): void {
  pendingReading = reading;
}

export function consumeReading(id: string): ReadingDetail | null {
  if (pendingReading?.id === id) {
    const r = pendingReading;
    pendingReading = null;
    return r;
  }
  return null;
}
