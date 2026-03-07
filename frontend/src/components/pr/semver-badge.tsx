'use client';

import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SemverBadgeProps {
  bump: string;
}

const bumpStyles: Record<string, string> = {
  patch: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  minor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  major: 'bg-red-500/15 text-red-400 border-red-500/30',
  none: 'bg-muted/50 text-muted-foreground border-border/50',
};

export function SemverBadge({ bump }: SemverBadgeProps) {
  const styles = bumpStyles[bump] ?? bumpStyles.none;

  if (bump === 'none') {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        styles,
      )}
    >
      <ArrowUp className="h-3 w-3" />
      {bump}
    </span>
  );
}
