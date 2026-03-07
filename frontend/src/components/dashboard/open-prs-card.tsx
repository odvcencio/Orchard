'use client';

import Link from 'next/link';
import { GitPullRequest } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RelativeTime } from '@/components/shared/relative-time';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/lib/api/hooks';
import type { Notification } from '@/lib/api/types';

function isPRNotification(n: Notification): boolean {
  const t = n.type.toLowerCase();
  return t.includes('pr') || t.includes('pull') || t.includes('review');
}

function extractRepoFromPath(resourcePath?: string): string {
  if (!resourcePath) return '';
  // Paths like /owner/repo/pulls/123 → "owner/repo"
  const parts = resourcePath.split('/').filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  return '';
}

function PRItem({ notification }: { notification: Notification }) {
  const initials = notification.actor_name
    ? notification.actor_name.slice(0, 2).toUpperCase()
    : '??';
  const repo = extractRepoFromPath(notification.resource_path);

  return (
    <Link
      href={notification.resource_path ?? '#'}
      className="flex items-start gap-3 py-3 px-2 -mx-2 hover:bg-muted/40 rounded-md transition-colors"
    >
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
        <GitPullRequest className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-snug truncate">
          {notification.title}
        </p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {repo && (
            <span className="text-xs text-muted-foreground truncate">{repo}</span>
          )}
          {notification.actor_name && (
            <div className="flex items-center gap-1">
              <Avatar size="sm" className="h-3.5 w-3.5">
                <AvatarFallback className="text-[8px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">{notification.actor_name}</span>
            </div>
          )}
          <RelativeTime date={notification.created_at} className="text-xs" />
        </div>
      </div>
      {!notification.read_at && (
        <Badge variant="secondary" className="shrink-0 text-xs h-5 mt-0.5">
          New
        </Badge>
      )}
    </Link>
  );
}

function OpenPRsSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3">
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <div className="flex gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function OpenPRsCard() {
  const { data: notifications, isLoading } = useNotifications();

  const prNotifications = notifications?.filter(isPRNotification).slice(0, 8) ?? [];

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Pull Requests</CardTitle>
          {prNotifications.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {prNotifications.length}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <OpenPRsSkeleton />
        ) : prNotifications.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <GitPullRequest className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">You&apos;re all caught up!</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No pull requests need your attention.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {prNotifications.map((notification) => (
              <PRItem key={notification.id} notification={notification} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
