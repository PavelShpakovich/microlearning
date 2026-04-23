import { Skeleton } from '@/components/ui/skeleton';

// ─── Settings ────────────────────────────────────────────────────────────────
// Mirrors: settings/page.tsx + settings-form.tsx
// Layout: page header → 2-col grid (profile + privacy) → preferences card → danger zone → action buttons

export function SettingsSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <section className="flex flex-col gap-2">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </section>

      {/* 2-col card grid: Profile + Privacy */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile card */}
        <div className="rounded-xl border bg-card p-6 flex flex-col gap-0">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-3 w-44 mb-4" />
          {/* FieldRows: email, name, timezone */}
          {['w-10', 'w-8', 'w-24'].map((w, i) => (
            <div
              key={i}
              className="flex items-center justify-between gap-4 py-3 border-b border-border/50 last:border-0"
            >
              <Skeleton className={`h-3.5 ${w}`} />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>

        {/* Privacy card */}
        <div className="rounded-xl border bg-card p-6 flex flex-col gap-0">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-3 w-56 mb-4" />
          {/* FieldRow: birth consent */}
          <div className="flex items-center justify-between gap-4 py-3">
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Reading preferences card */}
      <div className="rounded-xl border bg-card p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-3 w-72" />
        {/* Tone + Spiritual toggle */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-24" />
            <div className="flex items-center gap-3 h-9">
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          </div>
        </div>
        {/* Focus areas */}
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-3.5 w-28" />
          <div className="flex flex-wrap gap-4">
            {['w-24', 'w-20', 'w-32'].map((w, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className={`h-3.5 ${w}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
      </div>

      {/* Danger zone card */}
      <div className="rounded-xl border border-destructive/30 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-3 w-48 mb-4" />
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
          <Skeleton className="h-8 w-36 rounded-lg shrink-0" />
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-44 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </main>
  );
}

// ─── Admin table ──────────────────────────────────────────────────────────────
// Mirrors: admin/page.tsx user table

export function AdminTableSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Mobile skeleton */}
      <div className="md:hidden flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4 flex flex-col gap-3 bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3 w-28" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-8 w-32 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Desktop skeleton */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {Array.from({ length: 5 }).map((_, i) => (
                <th key={i} className="px-4 py-3">
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b">
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-40" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-4 w-28" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-5 w-16 rounded-full" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-8 w-32 rounded-md" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="size-8 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
// Mirrors: dashboard/page.tsx
// Layout: hero → sky widget → horoscope widget → stats strip → quick-actions → recent charts → recent readings → suggested readings

export function DashboardSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-1.5">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-9 w-64" />
      </section>

      {/* Today's sky widget */}
      <div className="rounded-2xl border bg-card px-6 py-4">
        <Skeleton className="h-3 w-28 mb-3" />
        <div className="flex flex-wrap gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="size-6 rounded-full shrink-0" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Personal horoscope widget */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 min-w-0">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg shrink-0" />
      </div>

      {/* Stats strip — 3 cols matching page */}
      <div className="grid grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 rounded-xl border bg-card overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <Skeleton className="size-9 rounded-lg shrink-0" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions card */}
      <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-6 py-5">
        <Skeleton className="h-4 w-28 shrink-0" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* Recent charts */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-full shrink-0" />
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent readings */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <Skeleton className="size-4 shrink-0 rounded" />
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// ─── Charts page ─────────────────────────────────────────────────────────────
// Mirrors: charts-overview.tsx
// Layout: hero (h1 + desc + button) → "Saved charts" heading → 3-col card grid

export function ChartsPageSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg shrink-0" />
      </section>

      {/* "Saved charts" heading */}
      <section className="flex flex-col gap-4">
        <Skeleton className="h-5 w-36" />

        {/* Card grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card flex flex-col">
              {/* CardHeader: avatar + label/name */}
              <div className="p-4 pb-3 flex items-start gap-3">
                <Skeleton className="size-11 rounded-full shrink-0" />
                <div className="flex flex-col gap-1.5 min-w-0 pt-0.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>
              {/* CardContent: date + location */}
              <div className="px-4 pb-3 flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-36" />
              </div>
              {/* CardFooter: subject badge + status + delete */}
              <div className="px-4 py-3 border-t flex items-center justify-between">
                <Skeleton className="h-5 w-14 rounded-full" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-12" />
                  <Skeleton className="size-8 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export function NewChartSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </section>

      <section className="rounded-xl border bg-card">
        <div className="flex flex-col gap-4 border-b px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-56 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="size-9 rounded-full" />
              ))}
            </div>
          </div>

          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        <div className="grid gap-5 px-6 py-6">
          <div className="rounded-2xl border bg-muted/20 p-4">
            <Skeleton className="h-4 w-full max-w-[34rem]" />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="grid gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <div className="hidden md:block" />
          </div>

          <div className="flex flex-col gap-3 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-36 rounded-lg" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Chart detail ────────────────────────────────────────────────────────────
// Mirrors: charts/[chartId]/page.tsx
// Layout: breadcrumb → hero card → chart stats (3-col) → wheel → positions + angles → aspects → readings

export function ChartDetailSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <Skeleton className="h-8 w-28 rounded-lg" />

      {/* Hero card */}
      <section className="rounded-2xl border bg-card p-6 md:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 rounded-full shrink-0" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-3.5 w-32" />
              <div className="mt-1 flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
          </div>
          {/* Actions panel — 3 buttons in rounded panel */}
          <div className="w-full shrink-0 sm:w-72">
            <div className="rounded-2xl border bg-muted/30 p-2.5">
              <div className="flex flex-col gap-2">
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-11 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5 grid gap-3 border-t pt-5 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      </section>

      {/* Chart stats — 3-col grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
            <Skeleton className="h-3 w-20" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: i < 2 ? 4 : 2 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-14 shrink-0" />
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Skeleton key={k} className="size-2 rounded-full" />
                    ))}
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Extended stats — 2-col grid (polarity, dominant signs, stelliums, dignities) */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Polarity */}
        <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          <div className="flex flex-col gap-3">
            {[0, 1].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="h-3 w-16 shrink-0" />
                <div className="flex flex-1 gap-1">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Skeleton key={k} className="size-2 rounded-full" />
                  ))}
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            ))}
          </div>
        </div>
        {/* Dominant signs */}
        <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-2.5 w-52" />
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((j) => (
              <Skeleton key={j} className="h-7 w-20 rounded-full" />
            ))}
          </div>
        </div>
        {/* Stelliums */}
        <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-2.5 w-56" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>
        {/* Dignities */}
        <div className="rounded-2xl border bg-card p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-52" />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex items-center gap-2 rounded-lg px-3 py-1.5">
                <Skeleton className="size-4 rounded shrink-0" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-24 ml-auto" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart wheel */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-[300px] w-full rounded-2xl sm:h-[400px]" />
      </section>

      {/* Positions */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
              <Skeleton className="size-5 rounded shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            </div>
          ))}
        </div>
        {/* Angles strip */}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3"
            >
              <Skeleton className="size-5 rounded shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Aspects */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-16" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-2.5">
              <Skeleton className="size-6 rounded shrink-0" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </section>

      {/* Readings */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-4 w-36" />
        <div className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-full max-w-xs" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full shrink-0" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

// ─── Readings page ────────────────────────────────────────────────────────────
// Mirrors: readings/page.tsx + readings-list.tsx
// Layout: section header → list of Card items (type label + title + summary + status/date/delete)

export function ReadingsPageSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Section header */}
      <section className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </section>

      {/* Search & filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-full sm:w-52 rounded-lg" />
      </div>

      {/* Reading cards */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card">
            {/* CardHeader: type label + title */}
            <div className="px-5 pt-4 pb-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 rounded shrink-0" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-56" />
            </div>
            {/* CardContent: summary + footer row */}
            <div className="px-5 pb-4 flex flex-col gap-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="size-8 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ─── Reading detail ───────────────────────────────────────────────────────────
// Mirrors: readings/[readingId]/page.tsx
// Layout: back link → title block → action row → summary → key takeaways → sections list

export function ReadingDetailSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Back link */}
      <Skeleton className="h-8 w-36 rounded-lg self-start" />

      {/* Title block */}
      <section className="flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <div className="flex items-center gap-3 mt-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </section>

      {/* Action buttons row */}
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-28 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-8 w-28 rounded-lg" />
      </div>

      {/* Summary */}
      <div className="rounded-2xl border bg-primary/5 p-6 md:p-8">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5 mt-2" />
        <Skeleton className="h-3.5 w-3/5 mt-2" />
      </div>

      {/* Key Takeaways — numbered list */}
      <div className="rounded-2xl border border-primary/20 bg-card p-6 flex flex-col gap-4">
        <Skeleton className="h-3 w-28" />
        <ol className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-start gap-3">
              <Skeleton className="size-5 rounded-full shrink-0 mt-0.5" />
              <Skeleton className="h-3.5 flex-1" />
            </li>
          ))}
        </ol>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="flex flex-col gap-2 pl-0 sm:pl-10">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ─── Horoscope ────────────────────────────────────────────────────────────────
// Mirrors: horoscope/page.tsx
// Layout: header (label + name + date) → key theme chip → moon phase line → interpretation card → advice card → footer nav

export function HoroscopeSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-3.5 w-48" />
        </div>
      </section>

      {/* Key theme chip */}
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <Skeleton className="size-4 rounded shrink-0" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* Moon phase line */}
      <div className="border-l-2 border-primary/30 pl-4">
        <Skeleton className="h-3.5 w-56" />
      </div>

      {/* Main interpretation card */}
      <div className="rounded-2xl border bg-card p-6 md:p-8 flex flex-col gap-3">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-full mt-1" />
        <Skeleton className="h-3.5 w-3/5" />
      </div>

      {/* Advice card */}
      <div className="rounded-2xl border border-primary/20 bg-card p-5 flex flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>

      {/* Footer nav */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-6">
        <Skeleton className="h-8 w-36 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>
    </main>
  );
}

// ─── Compatibility ────────────────────────────────────────────────────────────
// Mirrors: compatibility/page.tsx → CompatibilityOverview component
// Layout: section header + new button → list of report Cards (CardHeader + CardContent)

export function CompatibilitySkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Section header */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg shrink-0" />
      </section>

      {/* Report cards — mirrors CardHeader + CardContent structure */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card">
            {/* CardHeader: Heart icon + section label + CardTitle */}
            <div className="px-5 pt-4 pb-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Skeleton className="size-3.5 rounded shrink-0" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-5 w-52" />
            </div>
            {/* CardContent: status + date + delete */}
            <div className="px-5 pb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="size-8 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ─── Compatibility report detail ──────────────────────────────────────────────
// Mirrors: compatibility/[reportId]/page.tsx
// Layout: header → person header card → harmony score section → summary → sections → advice

export function CompatibilityReportSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-72 max-w-full" />
          <Skeleton className="h-3.5 w-32" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </section>

      {/* Harmony score card */}
      <section className="overflow-hidden rounded-[2rem] border bg-card">
        {/* Person header strip */}
        <div className="border-b px-6 py-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-full shrink-0" />
            <div className="flex flex-col gap-1">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-16" />
          <div className="flex flex-row-reverse items-center gap-3">
            <Skeleton className="size-11 rounded-full shrink-0" />
            <div className="flex flex-col gap-1 items-end">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
        {/* Gauge + info grid */}
        <div className="grid gap-6 px-6 py-6 xl:grid-cols-2 xl:items-center">
          {/* Gauge area */}
          <div className="rounded-[1.75rem] border bg-background/80 px-4 py-6 flex flex-col items-center gap-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="w-full max-w-80 aspect-260/190 rounded-2xl" />
          </div>
          {/* Info column */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-12 w-24" />
            </div>
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="rounded-2xl border bg-muted/30 p-4 flex flex-col gap-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3.5 w-full" />
                  <Skeleton className="h-3.5 w-4/5" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Summary */}
      <div className="rounded-2xl border bg-primary/5 p-6 md:p-8">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-4/5 mt-2" />
        <Skeleton className="h-3.5 w-3/5 mt-2" />
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-7 rounded-full shrink-0" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="flex flex-col gap-2 pl-0 sm:pl-10">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

// ─── Calendar ─────────────────────────────────────────────────────────────────
// Mirrors: calendar/page.tsx
// Layout: header (with side button) → legend (4 items) → month sections with responsive 6-col day grid

export function CalendarSkeleton() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header with side button */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-36 rounded-lg shrink-0" />
      </section>

      {/* Legend — 4 items: Sun, Moon, new moon, full moon */}
      <div className="flex flex-wrap gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1.5">
            <Skeleton className="size-3 rounded-sm shrink-0" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* First month section */}
      <section>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-3 bg-card flex flex-col gap-1.5">
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-5" />
                <Skeleton className="size-3 rounded-sm" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </section>

      {/* Second month section (partial) */}
      <section>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-3 bg-card flex flex-col gap-1.5">
              <div className="flex items-center justify-between mb-1">
                <Skeleton className="h-4 w-5" />
                <Skeleton className="size-3 rounded-sm" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
