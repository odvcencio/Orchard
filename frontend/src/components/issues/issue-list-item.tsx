'use client';

import Link from 'next/link';
import { CircleDot } from 'lucide-react';
import { RelativeTime } from '@/components/shared/relative-time';
import type { Issue } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface IssueListItemProps {
  issue: Issue;
  owner: string;
  repo: string;
}

const stateIconColor: Record<string, string> = {
  open: 'text-emerald-400',
  closed: 'text-red-400',
};

export function IssueListItem({ issue, owner, repo }: IssueListItemProps) {
  const iconColor = stateIconColor[issue.state] ?? stateIconColor.open;

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      {/* Status icon */}
      <div className="mt-0.5 shrink-0">
        <CircleDot className={cn('h-4 w-4', iconColor)} />
      </div>

      {/* Middle: title + meta */}
      <div className="flex-1 min-w-0">
        <Link
          href={`/${owner}/${repo}/issues/${issue.number}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors line-clamp-1"
        >
          {issue.title}
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">
          #{issue.number} opened <RelativeTime date={issue.created_at} />
          {issue.author_name && (
            <> by <span className="text-foreground/70">{issue.author_name}</span></>
          )}
        </p>
      </div>
    </div>
  );
}
