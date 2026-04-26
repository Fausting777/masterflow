import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';

export default function ClientsLoading() {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-9 w-20" />
      </div>

      <Skeleton className="mb-4 h-10 w-full" />

      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
