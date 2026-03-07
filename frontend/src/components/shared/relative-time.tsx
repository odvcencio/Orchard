'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface RelativeTimeProps {
  date: string | number | Date;
  className?: string;
}

function toRelativeString(date: Date, nowMs: number): string {
  const diffMs = Math.max(0, nowMs - date.getTime());
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1m ago' : `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return diffHours === 1 ? '1h ago' : `${diffHours}h ago`;
  }
  if (diffDays === 1) {
    return 'yesterday';
  }
  if (diffDays < 30) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    return diffMonths === 1 ? '1 month ago' : `${diffMonths} months ago`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? '1 year ago' : `${diffYears} years ago`;
}

function toFullDateString(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const parsed = useMemo(() => (date instanceof Date ? date : new Date(date)), [date]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const relative = useMemo(() => toRelativeString(parsed, nowMs), [parsed, nowMs]);

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <time
            dateTime={parsed.toISOString()}
            className={cn('text-muted-foreground cursor-default', className)}
          >
            {relative}
          </time>
        </TooltipTrigger>
        <TooltipContent>
          {toFullDateString(parsed)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
