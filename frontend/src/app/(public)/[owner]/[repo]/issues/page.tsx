'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { CircleDot, Search, LogIn, Plus } from 'lucide-react';
import { useIssues, useCreateIssue } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/use-auth';
import { IssueListItem } from '@/components/issues/issue-list-item';
import { EmptyState } from '@/components/shared/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type IssueState = 'open' | 'closed';

const tabs: { label: string; value: IssueState }[] = [
  { label: 'Open', value: 'open' },
  { label: 'Closed', value: 'closed' },
];

const emptyMessages: Record<IssueState, { title: string; description: string }> = {
  open: {
    title: 'No open issues',
    description: 'There are no open issues in this repository.',
  },
  closed: {
    title: 'No closed issues',
    description: 'There are no closed issues in this repository.',
  },
};

function IssueSkeletonRow() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </div>
    </div>
  );
}

interface NewIssueFormProps {
  owner: string;
  repo: string;
  onClose: () => void;
}

function NewIssueForm({ owner, repo, onClose }: NewIssueFormProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const createIssue = useCreateIssue();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    createIssue.mutate(
      { owner, repo, title: trimmedTitle, body: body.trim() || undefined },
      {
        onSuccess: () => {
          setTitle('');
          setBody('');
          onClose();
        },
      },
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-border/50 bg-card p-4">
      <h2 className="mb-3 text-sm font-semibold text-foreground">New Issue</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Issue title"
          required
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Description (optional, markdown supported)"
          rows={4}
          className={cn(
            'w-full resize-y rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5',
            'text-sm text-foreground placeholder:text-muted-foreground',
            'focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50',
            'transition-colors',
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!title.trim() || createIssue.isPending}>
            {createIssue.isPending ? 'Creating...' : 'Submit issue'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function IssuesPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const { isAuthenticated } = useAuth();
  const owner = params.owner;
  const repo = params.repo;

  const [activeTab, setActiveTab] = useState<IssueState>('open');
  const [search, setSearch] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);

  const { data: issues, isLoading } = useIssues(owner, repo, activeTab);
  const filtered = (issues ?? []).filter((issue) =>
    issue.title.toLowerCase().includes(search.toLowerCase()),
  );
  const loginHref = `/login?returnTo=${encodeURIComponent(`/${owner}/${repo}/issues`)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issues..."
            className="pl-8"
          />
        </div>

        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;
            const count = isActive ? (issues ?? []).length : undefined;
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

        {isAuthenticated ? (
          <Button size="sm" onClick={() => setShowNewForm((value) => !value)} className="shrink-0">
            <Plus className="h-4 w-4" />
            New issue
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={loginHref}>
              <LogIn className="h-4 w-4" />
              Sign in to open issue
            </Link>
          </Button>
        )}
      </div>

      {isAuthenticated && showNewForm ? (
        <NewIssueForm owner={owner} repo={repo} onClose={() => setShowNewForm(false)} />
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border/50">
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 5 }).map((_, i) => (
              <IssueSkeletonRow key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={CircleDot}
            title={search ? 'No issues match your search' : emptyMessages[activeTab].title}
            description={search ? 'Try a different search term.' : emptyMessages[activeTab].description}
          />
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map((issue) => (
              <IssueListItem key={issue.id} issue={issue} owner={owner} repo={repo} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
