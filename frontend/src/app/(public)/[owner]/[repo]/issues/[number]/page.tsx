'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CircleDot, LogIn } from 'lucide-react';
import { RelativeTime } from '@/components/shared/relative-time';
import { IssueTimeline } from '@/components/issues/issue-timeline';
import { MarkdownPreview } from '@/components/shared/markdown-viewer';
import { useAuth } from '@/lib/auth/use-auth';
import { useIssue, useUpdateIssue } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';

const stateStyles: Record<string, string> = {
  open: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400',
  closed: 'border-red-500/30 bg-red-500/15 text-red-400',
};

const stateLabel: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
};

function IssueDetailSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-5 py-4">
      <div className="space-y-2 border-b border-border/50 pb-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-7 flex-1 rounded" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-48 rounded" />
        </div>
      </div>
      <Skeleton className="h-32 rounded-lg" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function IssueDetailPage() {
  const params = useParams<{ owner: string; repo: string; number: string }>();
  const { isAuthenticated } = useAuth();
  const owner = params.owner;
  const repo = params.repo;
  const issueNumber = parseInt(params.number, 10);

  const { data: issue, isLoading } = useIssue(owner, repo, issueNumber);
  const updateIssue = useUpdateIssue();

  if (isLoading) {
    return <IssueDetailSkeleton />;
  }

  if (!issue) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Issue not found.</p>
      </div>
    );
  }

  const stateCls = stateStyles[issue.state] ?? stateStyles.open;
  const label = stateLabel[issue.state] ?? issue.state;
  const isOpen = issue.state === 'open';
  const loginHref = `/login?returnTo=${encodeURIComponent(`/${owner}/${repo}/issues/${issueNumber}`)}`;

  function handleToggleState() {
    updateIssue.mutate({
      owner,
      repo,
      number: issueNumber,
      state: isOpen ? 'closed' : 'open',
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 py-4">
      <div className="space-y-3 border-b border-border/50 pb-4">
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="min-w-0 flex-1 text-xl font-semibold leading-snug text-foreground">
            {issue.title}
            <span className="ml-2 text-base font-normal text-muted-foreground">
              #{issue.number}
            </span>
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                stateCls,
              )}
            >
              <CircleDot className="h-3 w-3" />
              {label}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{issue.author_name ?? 'Unknown'}</span>
            {' opened '}
            <RelativeTime date={issue.created_at} />
            {issue.closed_at ? (
              <>
                {' · closed '}
                <RelativeTime date={issue.closed_at} />
              </>
            ) : null}
          </p>

          {isAuthenticated ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleState}
              disabled={updateIssue.isPending}
            >
              {updateIssue.isPending
                ? isOpen ? 'Closing...' : 'Reopening...'
                : isOpen ? 'Close issue' : 'Reopen issue'}
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link href={loginHref}>
                <LogIn className="h-4 w-4" />
                Sign in to update
              </Link>
            </Button>
          )}
        </div>
      </div>

      {issue.body ? (
        <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
          <MarkdownPreview
            source={issue.body}
            className="text-sm leading-relaxed text-foreground/90 break-words"
          />
        </div>
      ) : null}

      <IssueTimeline owner={owner} repo={repo} issueNumber={issueNumber} />
    </div>
  );
}
