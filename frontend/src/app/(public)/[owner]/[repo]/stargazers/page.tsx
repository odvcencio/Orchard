'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Star } from 'lucide-react';
import { useRepoStargazers } from '@/lib/api/hooks';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

function StargazerSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

export default function StargazersPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const owner = params.owner;
  const repo = params.repo;
  const { data, isLoading } = useRepoStargazers(owner, repo);
  const stargazers = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Stargazers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People who starred {owner}/{repo}.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/50">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, index) => (
              <StargazerSkeleton key={index} />
            ))}
          </div>
        ) : stargazers.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No stargazers yet"
            description="Stars will show up here once people start following this repository."
          />
        ) : (
          <div className="divide-y divide-border/50">
            {stargazers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 px-4 py-3">
                <Star className="h-4 w-4 text-amber-500" />
                <Link
                  href={`/${user.username}`}
                  className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                >
                  {user.username}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
