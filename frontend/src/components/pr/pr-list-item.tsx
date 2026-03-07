'use client';

import Link from 'next/link';
import { GitPullRequest } from 'lucide-react';
import { RelativeTime } from '@/components/shared/relative-time';
import type { PullRequest } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface PRListItemProps {
  pr: PullRequest;
  owner: string;
  repo: string;
}

const stateIconColor: Record<string, string> = {
  open: 'text-emerald-400',
  closed: 'text-red-400',
  merged: 'text-violet-400',
};

export function PRListItem({ pr, owner, repo }: PRListItemProps) {
  const iconColor = stateIconColor[pr.state] ?? stateIconColor.open;

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        <GitPullRequest className={cn('h-4 w-4', iconColor)} />
      </div>

      {/* Middle: title + meta */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/${owner}/${repo}/pulls/${pr.number}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
        >
          {pr.title}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          #{pr.number} opened <RelativeTime date={pr.created_at} />
          {pr.author_name && (
            <> by <span className="text-foreground/70">{pr.author_name}</span></>
          )}
        </p>
      </div>

      {/* Right: branch labels */}
      <div className="shrink-0 hidden sm:flex items-center gap-1 font-mono text-xs text-muted-foreground">
        <span>{pr.source_branch}</span>
        <span className="text-muted-foreground/50">→</span>
        <span>{pr.target_branch}</span>
      </div>
    </div>
  );
}
