import { Skeleton } from '@/components/ui/Skeleton';

export default function StatsLoading() {
  return (
    <div>
      <Skeleton className="mb-4 h-8 w-24" />

      {/* Period picker */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap gap-2">
          {[70, 80, 90, 100, 110].map((w, i) => (
            <Skeleton key={i} className="h-8 rounded-lg" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>

      {/* Two columns */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <Skeleton className="mb-4 h-4 w-28" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
