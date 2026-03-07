'use client';

import { GitBranch, ArrowLeft } from 'lucide-react';
import { RelativeTime } from '@/components/shared/relative-time';
import { SemverBadge } from '@/components/pr/semver-badge';
import { useSemver } from '@/lib/api/hooks';
import type { PullRequest } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface PRHeaderProps {
  pr: PullRequest;
  owner: string;
  repo: string;
}

const stateStyles: Record<string, string> = {
  open: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  closed: 'bg-red-500/15 text-red-400 border-red-500/30',
  merged: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
};

const stateLabel: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  merged: 'Merged',
};

export function PRHeader({ pr, owner, repo }: PRHeaderProps) {
  const { data: semver } = useSemver(owner, repo, pr.target_commit, pr.source_commit);

  const stateCls = stateStyles[pr.state] ?? stateStyles.open;
  const label = stateLabel[pr.state] ?? pr.state;

  return (
    <div className="space-y-3 pb-4 border-b border-border/50">
      {/* Title row */}
      <div className="flex flex-wrap items-start gap-3">
        <h1 className="flex-1 min-w-0 text-xl font-semibold text-foreground leading-snug">
          {pr.title}
          <span className="ml-2 text-muted-foreground font-normal text-base">
            #{pr.number}
          </span>
        </h1>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
              stateCls,
            )}
          >
            {label}
          </span>
          {semver && <SemverBadge bump={semver.bump} />}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {/* Author + time */}
        <span>
          <span className="text-foreground font-medium">{pr.author_name ?? 'Unknown'}</span>
          {' opened '}
          <RelativeTime date={pr.created_at} />
        </span>

        <span className="text-border/60">·</span>

        {/* Branch labels */}
        <span className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 shrink-0" />
          <code className="font-mono text-xs text-foreground bg-muted/50 rounded px-1.5 py-0.5">
            {pr.source_branch}
          </code>
          <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground/60" />
          <code className="font-mono text-xs text-foreground bg-muted/50 rounded px-1.5 py-0.5">
            {pr.target_branch}
          </code>
        </span>

        {pr.merged_at && (
          <>
            <span className="text-border/60">·</span>
            <span>
              merged <RelativeTime date={pr.merged_at} />
            </span>
          </>
        )}
      </div>
    </div>
  );
}
