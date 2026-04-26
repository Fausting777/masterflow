import type React from 'react';

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

export function Skeleton({ className = '', style }: Props) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800 ${className}`}
      style={style}
    />
  );
}

export function SkeletonCard({ className = '' }: Props) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  );
}
