import { Skeleton } from '@/components/ui/skeleton';

export function SettingsSkeleton() {
  return (
    <main className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-6">
      {/* Profile Card */}
      <div className="rounded-lg border bg-card p-6 flex flex-col gap-6">
        <div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>

        <div className="flex justify-end">
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Security Card */}
      <div className="rounded-lg border bg-card p-6 flex flex-col gap-6">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-40 mt-2" />
        </div>

        <div className="flex flex-col gap-2">
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
              {Array.from({ length: 7 }).map((_, i) => (
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
                  <Skeleton className="h-4 w-12 mx-auto" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-8 w-32 rounded-md" />
                </td>
                <td className="px-4 py-3">
                  <Skeleton className="h-8 w-20 rounded-md" />
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

export function DashboardSkeleton() {
  return (
    <main className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
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
