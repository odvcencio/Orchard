'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  GitPullRequest,
  MessageSquare,
  AlertCircle,
  GitCommit,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RelativeTime } from '@/components/shared/relative-time';
import { EmptyState } from '@/components/shared/empty-state';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/lib/api/hooks';
import type { Notification } from '@/lib/api/types';

// ── Icon helpers ──────────────────────────────────────────────────────────────

function renderNotificationIcon(type: string, className: string) {
  if (type.includes('pr') || type.includes('pull') || type.includes('merge')) {
    return <GitPullRequest className={className} />;
  }
  if (type.includes('comment') || type.includes('review')) {
    return <MessageSquare className={className} />;
  }
  if (type.includes('issue')) {
    return <AlertCircle className={className} />;
  }
  if (type.includes('push') || type.includes('commit')) {
    return <GitCommit className={className} />;
  }
  return <Bell className={className} />;
}

function getNotificationIconColor(type: string): string {
  if (type.includes('merge')) return 'text-purple-400';
  if (type.includes('pr') || type.includes('pull')) return 'text-blue-400';
  if (type.includes('issue')) return 'text-yellow-400';
  if (type.includes('comment') || type.includes('review')) return 'text-green-400';
  if (type.includes('push') || type.includes('commit')) return 'text-orange-400';
  return 'text-muted-foreground';
}

// ── Repo grouping ─────────────────────────────────────────────────────────────

function extractRepo(resourcePath?: string): string | null {
  if (!resourcePath) return null;
  // resource_path typically looks like "/owner/repo/pulls/1" or "/owner/repo/issues/2"
  const parts = resourcePath.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return null;
}

// ── Notification item ─────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: number) => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const iconColor = getNotificationIconColor(notification.type);
  const isUnread = !notification.read_at;

  const handleClick = () => {
    if (isUnread) {
      onMarkRead(notification.id);
    }
  };

  const inner = (
    <div
      className={`flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40 rounded-lg ${isUnread ? 'bg-muted/20' : ''}`}
      onClick={handleClick}
    >
      {/* Icon */}
      <div
        className={`mt-0.5 shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-muted ${iconColor}`}
      >
        {renderNotificationIcon(notification.type, 'h-4 w-4')}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug">
          {notification.actor_name && (
            <span className="font-semibold">{notification.actor_name} </span>
          )}
          <span>{notification.title}</span>
        </p>
        {notification.body && (
          <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-prose">
            {notification.body}
          </p>
        )}
        <RelativeTime date={notification.created_at} className="mt-1 text-xs" />
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <span
          className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500"
          aria-label="Unread"
        />
      )}
    </div>
  );

  if (notification.resource_path) {
    return (
      <Link href={notification.resource_path} className="block">
        {inner}
      </Link>
    );
  }

  return <div className="cursor-default">{inner}</div>;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function NotificationsSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-4 px-4 py-3.5">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Grouped list ──────────────────────────────────────────────────────────────

interface GroupedNotificationsProps {
  notifications: Notification[];
  onMarkRead: (id: number) => void;
}

function GroupedNotifications({ notifications, onMarkRead }: GroupedNotificationsProps) {
  // Group by repo (extracted from resource_path), ungrouped go under null key
  const groups = new Map<string, Notification[]>();

  for (const n of notifications) {
    const repo = extractRepo(n.resource_path);
    const key = repo ?? '__ungrouped__';
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(n);
  }

  // Sort: repos with unread first, ungrouped last
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === '__ungrouped__') return 1;
    if (b === '__ungrouped__') return -1;
    const aUnread = groups.get(a)!.some((n) => !n.read_at);
    const bUnread = groups.get(b)!.some((n) => !n.read_at);
    if (aUnread && !bUnread) return -1;
    if (!aUnread && bUnread) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6">
      {sortedKeys.map((key, groupIdx) => {
        const items = groups.get(key)!;
        const label = key === '__ungrouped__' ? null : key;

        return (
          <div key={key}>
            {label && (
              <div className="mb-2 px-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
              </div>
            )}
            <div className="rounded-lg border border-border/50 bg-card overflow-hidden divide-y divide-border/30">
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={onMarkRead}
                />
              ))}
            </div>
            {groupIdx < sortedKeys.length - 1 && <Separator className="mt-6" />}
          </div>
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [filterUnread, setFilterUnread] = useState(false);

  const { data: notifications, isLoading } = useNotifications(filterUnread || undefined);
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();

  const items = notifications ?? [];
  const unreadCount = items.filter((n) => !n.read_at).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => markAllRead()}
          disabled={isMarkingAll || unreadCount === 0}
        >
          Mark all as read
        </Button>
      </div>

      {/* Filter toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={!filterUnread ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilterUnread(false)}
        >
          All
        </Button>
        <Button
          variant={filterUnread ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFilterUnread(true)}
        >
          Unread
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <NotificationsSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={
            filterUnread
              ? "You're all caught up. No unread notifications."
              : "You don't have any notifications yet."
          }
        />
      ) : (
        <GroupedNotifications notifications={items} onMarkRead={markRead} />
      )}
    </div>
  );
}
