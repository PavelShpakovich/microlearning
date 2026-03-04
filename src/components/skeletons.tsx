import { Skeleton } from '@/components/ui/skeleton';

export function SettingsSkeleton() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 space-y-6">
      {/* Profile Card */}
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Security Card */}
      <div className="rounded-lg border bg-card p-6 space-y-6">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </main>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div>
        <Skeleton className="h-8 w-40 mb-2" />
        <Skeleton className="h-4 w-60 mb-6" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 h-32">
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-4 w-3/4 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function StudySkeleton() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-10 min-h-screen">
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="mt-6 space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </main>
  );
}
