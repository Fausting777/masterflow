import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export default function ExpensesLoading() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Period pills */}
      <div className="mb-3 flex flex-wrap gap-2">
        {[60, 80, 70, 90, 75].map((w, i) => (
          <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
        ))}
      </div>

      {/* Category pills */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[50, 90, 80, 100, 70, 85].map((w, i) => (
          <Skeleton key={i} className="h-7 rounded-full" style={{ width: w }} />
        ))}
      </div>

      <Skeleton className="mb-4 h-10 w-full" />

      {/* Summary card */}
      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
