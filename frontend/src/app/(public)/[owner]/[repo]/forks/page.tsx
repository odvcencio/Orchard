'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { GitFork } from 'lucide-react';
import { useRepoForks } from '@/lib/api/hooks';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

function ForkSkeleton() {
  return (
    <div className="space-y-2 px-4 py-3">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export default function ForksPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const owner = params.owner;
  const repo = params.repo;
  const { data, isLoading } = useRepoForks(owner, repo);
  const forks = data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Forks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Forks of {owner}/{repo}.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/50">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, index) => (
              <ForkSkeleton key={index} />
            ))}
          </div>
        ) : forks.length === 0 ? (
          <EmptyState
            icon={GitFork}
            title="No forks yet"
            description="Forks will appear here when other developers copy this repository into their own namespace."
          />
        ) : (
          <div className="divide-y divide-border/50">
            {forks.map((fork) => (
              <div key={fork.id} className="space-y-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <GitFork className="h-4 w-4 text-muted-foreground" />
                  <Link
                    href={`/${fork.owner_name}/${fork.name}`}
                    className="text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    {fork.owner_name}/{fork.name}
                  </Link>
                </div>
                <p className="text-sm text-muted-foreground">
                  {fork.description || 'No description provided.'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
