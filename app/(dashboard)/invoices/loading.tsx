import { Skeleton } from '@/components/ui/Skeleton';

export default function InvoicesLoading() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-9 w-24" />
      </div>

      {/* Period picker */}
      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex flex-wrap gap-2">
          {[60, 80, 90, 70].map((w, i) => (
            <Skeleton key={i} className="h-8 rounded-lg" style={{ width: w }} />
          ))}
        </div>
      </div>

      <Skeleton className="mb-4 h-10 w-full" />

      {/* Summary */}
      <div className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-28" />
        </div>
      </div>

      {/* Table rows */}
      <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <div className="border-b border-neutral-100 p-4 dark:border-neutral-800">
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-3 w-full" />
            ))}
          </div>
        </div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-neutral-100 p-4 last:border-0 dark:border-neutral-800">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
