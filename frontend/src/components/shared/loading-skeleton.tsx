'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function SkeletonLine({ className }: { className?: string }) {
  return <Skeleton className={cn('h-4 w-full', className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex items-center gap-2 pt-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonCodeBlock() {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2 font-mono">
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-1" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0">
      <Skeleton className="h-4 w-4 shrink-0 rounded" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-24 shrink-0" />
      <Skeleton className="h-4 w-20 shrink-0" />
      <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: `${75 + ((i * 13) % 25)}%` }}
        />
      ))}
    </div>
  );
}
