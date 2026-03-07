'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Search, GitPullRequest, LogIn, Plus } from 'lucide-react';
import { usePullRequests } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/use-auth';
import { PRListItem } from '@/components/pr/pr-list-item';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type PRState = 'open' | 'closed' | 'merged';

const tabs: { label: string; value: PRState }[] = [
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
  { label: 'Merged', value: 'merged' },
];

const emptyMessages: Record<PRState, { title: string; description: string }> = {
  open: {
    title: 'No open pull requests',
    description: 'There are no open pull requests in this repository.',
  },
  closed: {
    title: 'No closed pull requests',
    description: 'There are no closed pull requests in this repository.',
  },
  merged: {
    title: 'No merged pull requests',
    description: 'There are no merged pull requests in this repository.',
  },
};

function PRSkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
      <Skeleton className="hidden h-3 w-32 shrink-0 sm:block" />
    </div>
  );
}

export default function PullRequestsPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const { isAuthenticated } = useAuth();
  const owner = params.owner;
  const repo = params.repo;

  const [activeTab, setActiveTab] = useState<PRState>('open');
  const [search, setSearch] = useState('');

  const { data: prs, isLoading } = usePullRequests(owner, repo, activeTab);
  const filtered = (prs ?? []).filter((pr) =>
    pr.title.toLowerCase().includes(search.toLowerCase()),
  );
  const createHref = isAuthenticated
    ? `/${owner}/${repo}/pulls/new`
    : `/login?returnTo=${encodeURIComponent(`/${owner}/${repo}/pulls`)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pull requests..."
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            const count = isActive ? (prs ?? []).length : undefined;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setActiveTab(tab.value);
                  setSearch('');
                }}
                className={
                  isActive
                    ? 'inline-flex items-center gap-1.5 rounded-md bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition-colors'
                    : 'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground'
                }
              >
                {tab.label}
                {count !== undefined && (
                  <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        <Button asChild size="sm" variant={isAuthenticated ? 'default' : 'outline'} className="shrink-0">
          <Link href={createHref}>
            {isAuthenticated ? <Plus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {isAuthenticated ? 'Open pull request' : 'Sign in to open PR'}
          </Link>
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/50">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <PRSkeletonRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={GitPullRequest}
            title={search ? 'No pull requests match your search' : emptyMessages[activeTab].title}
            description={search ? 'Try a different search term.' : emptyMessages[activeTab].description}
          />
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((pr) => (
              <PRListItem key={pr.id} pr={pr} owner={owner} repo={repo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
