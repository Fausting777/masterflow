import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div>
      <Skeleton className="mb-1 h-8 w-40" />
      <Skeleton className="mb-6 h-4 w-52" />

      {/* Profit card */}
      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-7 w-10" />
          </div>
        ))}
      </div>

      {/* Recent orders heading */}
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>

      {/* Order cards */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
