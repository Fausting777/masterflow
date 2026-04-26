import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export default function OrdersLoading() {
  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>

      {/* Filter pills */}
      <div className="mb-4 flex gap-2">
        {[80, 110, 120, 90].map((w, i) => (
          <Skeleton key={i} className={`h-7 w-[${w}px] rounded-full`} style={{ width: w }} />
        ))}
      </div>

      {/* Month filter */}
      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Skeleton className="mb-1 h-3 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>

      {/* Summary card */}
      <div className="mb-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-3 flex items-center justify-between">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-20" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Order list */}
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
