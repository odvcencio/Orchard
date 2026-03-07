'use client';

import { useState } from 'react';
import { MessageSquare, FileText } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthCallout } from '@/components/shared/auth-callout';
import { MarkdownPreview } from '@/components/shared/markdown-viewer';
import { RelativeTime } from '@/components/shared/relative-time';
import { usePRComments, usePRReviews, useCreatePRComment } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/use-auth';
import type { PRComment, PRReview } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface PRTimelineProps {
  owner: string;
  repo: string;
  prNumber: number;
  showComposer?: boolean;
}

type TimelineItem =
  | { kind: 'comment'; data: PRComment; created_at: string }
  | { kind: 'review'; data: PRReview; created_at: string };

function avatarInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const reviewStateStyles: Record<string, string> = {
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  changes_requested: 'bg-red-500/15 text-red-400 border-red-500/30',
  commented: 'bg-muted/50 text-muted-foreground border-border/50',
};

const reviewStateLabel: Record<string, string> = {
  approved: 'Approved',
  changes_requested: 'Changes requested',
  commented: 'Commented',
};

function CommentItem({ comment }: { comment: PRComment }) {
  const initials = avatarInitials(comment.author_name);
  return (
    <div className="flex gap-3">
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 rounded-lg border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/20">
          <span className="text-sm font-medium text-foreground">
            {comment.author_name ?? 'Unknown'}
          </span>
          <span className="text-xs text-muted-foreground">
            <RelativeTime date={comment.created_at} />
          </span>
          {comment.file_path && (
            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-mono">
              <FileText className="h-3 w-3" />
              {comment.file_path}
              {comment.line_number != null && `:${comment.line_number}`}
            </span>
          )}
        </div>
        <div className="px-3 py-2.5">
          <MarkdownPreview
            source={comment.body}
            className="text-sm leading-relaxed text-foreground/90 break-words"
            emptyMessage=""
          />
        </div>
      </div>
    </div>
  );
}

function ReviewItem({ review }: { review: PRReview }) {
  const initials = avatarInitials(review.author_name);
  const stateCls = reviewStateStyles[review.state] ?? reviewStateStyles.commented;
  const stateLabel = reviewStateLabel[review.state] ?? review.state;

  return (
    <div className="flex gap-3">
      <Avatar size="sm" className="mt-0.5 shrink-0">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0 rounded-lg border border-border/50 bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/20">
          <span className="text-sm font-medium text-foreground">
            {review.author_name ?? 'Unknown'}
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
              stateCls,
            )}
          >
            {stateLabel}
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            <RelativeTime date={review.created_at} />
          </span>
        </div>
        {review.body && (
          <div className="px-3 py-2.5">
            <MarkdownPreview
              source={review.body}
              className="text-sm leading-relaxed text-foreground/90 break-words"
              emptyMessage=""
            />
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="h-6 w-6 rounded-full shrink-0 mt-0.5" />
          <div className="flex-1 rounded-lg border border-border/50 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 bg-muted/20">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="px-3 py-2.5">
              <Skeleton className="h-4 w-full mb-1" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PRTimeline({
  owner,
  repo,
  prNumber,
  showComposer = true,
}: PRTimelineProps) {
  const [body, setBody] = useState('');
  const { isAuthenticated } = useAuth();

  const { data: comments, isLoading: commentsLoading } = usePRComments(owner, repo, prNumber);
  const { data: reviews, isLoading: reviewsLoading } = usePRReviews(owner, repo, prNumber);
  const createComment = useCreatePRComment();

  const isLoading = commentsLoading || reviewsLoading;

  // Merge and sort by created_at
  const items: TimelineItem[] = [
    ...(comments ?? []).map((c) => ({
      kind: 'comment' as const,
      data: c,
      created_at: c.created_at,
    })),
    ...(reviews ?? []).map((r) => ({
      kind: 'review' as const,
      data: r,
      created_at: r.created_at,
    })),
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const returnTo = `/${owner}/${repo}/pulls/${prNumber}`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    createComment.mutate(
      { owner, repo, number: prNumber, body: trimmed },
      { onSuccess: () => setBody('') },
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline items */}
      {isLoading ? (
        <TimelineSkeleton />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <MessageSquare className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) =>
            item.kind === 'comment' ? (
              <CommentItem key={`comment-${item.data.id}`} comment={item.data} />
            ) : (
              <ReviewItem key={`review-${item.data.id}`} review={item.data} />
            ),
          )}
        </div>
      )}

      {/* Comment form */}
      {showComposer ? (
        isAuthenticated ? (
          <form onSubmit={handleSubmit} className="space-y-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Leave a comment..."
              rows={4}
              className={cn(
                'w-full resize-y rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5',
                'text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring',
                'transition-colors',
              )}
            />
            <div className="flex justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Comments support markdown.
              </p>
              <Button
                type="submit"
                size="sm"
                disabled={!body.trim() || createComment.isPending}
              >
                {createComment.isPending ? 'Submitting...' : 'Comment'}
              </Button>
            </div>
          </form>
        ) : (
          <AuthCallout
            title="Sign in to join the review"
            description="Commenting and reviewing require an authenticated Orchard session."
            returnTo={returnTo}
            actionLabel="Sign in to comment"
          />
        )
      ) : null}
    </div>
  );
}
