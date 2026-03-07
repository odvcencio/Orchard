'use client';

import Link from 'next/link';
import {
  GitPullRequest,
  GitMerge,
  MessageSquare,
  CheckCheck,
  GitCommit,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RelativeTime } from '@/components/shared/relative-time';
import { EmptyState } from '@/components/shared/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useNotifications } from '@/lib/api/hooks';
import type { Notification } from '@/lib/api/types';

function renderNotificationIcon(type: string, className: string) {
  if (type.includes('merge')) return <GitMerge className={className} />;
  if (type.includes('pr') || type.includes('pull')) return <GitPullRequest className={className} />;
  if (type.includes('comment')) return <MessageSquare className={className} />;
  if (type.includes('review') || type.includes('approve')) return <CheckCheck className={className} />;
  if (type.includes('push') || type.includes('commit')) return <GitCommit className={className} />;
  return <Bell className={className} />;
}

function getNotificationIconColor(type: string): string {
  if (type.includes('merge')) return 'text-purple-400';
  if (type.includes('pr') || type.includes('pull')) return 'text-blue-400';
  if (type.includes('comment')) return 'text-yellow-400';
  if (type.includes('review') || type.includes('approve')) return 'text-green-400';
  if (type.includes('push') || type.includes('commit')) return 'text-orange-400';
  return 'text-muted-foreground';
}

function ActivityItem({ notification }: { notification: Notification }) {
  const iconColor = getNotificationIconColor(notification.type);
  const initials = notification.actor_name
    ? notification.actor_name.slice(0, 2).toUpperCase()
    : '??';

  const content = (
    <div className="flex items-start gap-3 py-3 group">
      <div className="relative shrink-0">
        <Avatar size="sm">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background ring-1 ring-border ${iconColor}`}
        >
          {renderNotificationIcon(notification.type, 'h-2 w-2')}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug truncate">
          {notification.actor_name && (
            <span className="font-medium">{notification.actor_name} </span>
          )}
          <span className="text-muted-foreground">{notification.title}</span>
        </p>
        <RelativeTime date={notification.created_at} className="text-xs mt-0.5" />
      </div>
      {!notification.read_at && (
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      )}
    </div>
  );

  if (notification.resource_path) {
    return (
      <Link
        href={notification.resource_path}
        className="block hover:bg-muted/40 rounded-md px-2 -mx-2 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return <div className="px-2 -mx-2">{content}</div>;
}

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3">
          <Skeleton className="h-6 w-6 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeed() {
  const { data: notifications, isLoading } = useNotifications();

  const recent = notifications?.slice(0, 10) ?? [];

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          <Link
            href="/notifications"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ActivityFeedSkeleton />
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No recent activity"
            description="Your activity feed will appear here."
          />
        ) : (
          <ScrollArea className="max-h-80">
            <div className="divide-y divide-border/50">
              {recent.map((notification) => (
                <ActivityItem key={notification.id} notification={notification} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
