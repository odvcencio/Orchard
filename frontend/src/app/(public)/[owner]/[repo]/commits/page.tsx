'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { GitCommit } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { CommitCard } from '@/components/commits/commit-card';
import { useCommits, useRepository } from '@/lib/api/hooks';
import type { CommitSummary } from '@/lib/api/types';

function groupByDate(commits: CommitSummary[]): Map<string, CommitSummary[]> {
  const groups = new Map<string, CommitSummary[]>();
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const commit of commits) {
    const date = new Date(commit.timestamp * 1000);
    let label: string;
    if (date.toDateString() === today.toDateString()) label = 'Today';
    else if (date.toDateString() === yesterday.toDateString()) label = 'Yesterday';
    else
      label = date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(commit);
  }
  return groups;
}

function CommitsSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3"
        >
          <Skeleton className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-5 w-16 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

export default function PublicCommitsPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const searchParams = useSearchParams();
  const owner = params.owner;
  const repo = params.repo;

  const { data: repository, isLoading: repoLoading } = useRepository(owner, repo);
  const defaultRef = repository?.default_branch ?? '';
  const ref = searchParams.get('ref') ?? defaultRef;

  const { data: commits, isLoading: commitsLoading } = useCommits(owner, repo, ref);

  const isLoading = repoLoading || commitsLoading;

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-foreground tracking-tight">Commit history</h1>
        {ref && (
          <p className="mt-1 text-sm text-muted-foreground">
            Branch: <code className="font-mono">{ref}</code>
          </p>
        )}
      </div>

      {isLoading ? (
        <CommitsSkeleton />
      ) : !commits || commits.length === 0 ? (
        <EmptyState icon={GitCommit} title="No commits yet" />
      ) : (
        <div>
          {Array.from(groupByDate(commits).entries()).map(([label, group]) => (
            <div key={label}>
              <p className="text-sm font-medium text-muted-foreground mt-6 mb-2">{label}</p>
              <div className="space-y-1.5">
                {group.map((commit) => (
                  <CommitCard
                    key={commit.hash}
                    commit={commit}
                    owner={owner}
                    repo={repo}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
