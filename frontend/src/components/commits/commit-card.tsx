'use client';

import { ShieldCheck } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RelativeTime } from '@/components/shared/relative-time';
import type { CommitSummary } from '@/lib/api/types';

interface CommitCardProps {
  commit: CommitSummary;
  owner: string;
  repo: string;
}

function authorInitials(author: string): string {
  const parts = author.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
  }
  return author.slice(0, 2).toUpperCase();
}

export function CommitCard({ commit }: CommitCardProps) {
  const lines = commit.message.split('\n');
  const title = lines[0] ?? '';
  const body = lines.slice(1).join('\n').trim();
  const shortHash = commit.hash.slice(0, 7);
  const isoTime = new Date(commit.timestamp * 1000).toISOString();

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3 hover:bg-card transition-colors">
      {/* Avatar */}
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <AvatarFallback className="text-xs">{authorInitials(commit.author)}</AvatarFallback>
      </Avatar>

      {/* Middle: message + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate leading-snug">{title}</p>
        {body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">{body}</p>
        )}
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{commit.author}</span>
          <span>·</span>
          <RelativeTime date={isoTime} className="text-xs" />
        </div>
      </div>

      {/* Right: hash + verified */}
      <div className="flex items-center gap-2 shrink-0 ml-2">
        {commit.verified && (
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-label="Verified" />
        )}
        <code className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
          {shortHash}
        </code>
      </div>
    </div>
  );
}
