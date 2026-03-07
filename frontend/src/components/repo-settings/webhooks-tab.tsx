'use client';

import { useState } from 'react';
import { Trash2, Plus, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { RelativeTime } from '@/components/shared/relative-time';
import { useWebhooks, useCreateWebhook, useDeleteWebhook } from '@/lib/api/hooks';
import type { Webhook } from '@/lib/api/types';

interface WebhooksTabProps {
  owner: string;
  repo: string;
}

function WebhookItem({
  webhook,
  onDelete,
}: {
  webhook: Webhook;
  onDelete: (id: number) => void;
}) {
  const eventCount = webhook.events?.length ?? 0;

  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">
          {webhook.active ? (
            <span className="block h-2.5 w-2.5 rounded-full bg-green-500" title="Active" />
          ) : (
            <span className="block h-2.5 w-2.5 rounded-full bg-muted-foreground" title="Inactive" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium font-mono truncate" title={webhook.url}>
            {webhook.url}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {webhook.active ? (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Inactive
              </Badge>
            )}
            {eventCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {eventCount} event{eventCount !== 1 ? 's' : ''}
              </span>
            )}
            {webhook.has_secret && (
              <span className="text-xs text-muted-foreground">Secret configured</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Added <RelativeTime date={webhook.created_at} />
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(webhook.id)}
        aria-label={`Delete webhook for ${webhook.url}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function WebhooksSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-3 py-3">
          <div className="flex items-start gap-3">
            <Skeleton className="h-2.5 w-2.5 rounded-full mt-1" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function AddWebhookForm({
  owner,
  repo,
  onSuccess,
}: {
  owner: string;
  repo: string;
  onSuccess: () => void;
}) {
  const [url, setUrl] = useState('');
  const { mutate: createWebhook, isPending, error } = useCreateWebhook();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    createWebhook(
      { owner, repo, url: url.trim(), active: true },
      {
        onSuccess: () => {
          setUrl('');
          onSuccess();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-3 items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="webhook-url">Payload URL</Label>
          <Input
            id="webhook-url"
            type="url"
            placeholder="https://example.com/webhook"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isPending}
          />
        </div>
        <Button type="submit" disabled={isPending || !url.trim()} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          {isPending ? 'Adding…' : 'Add Webhook'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to add webhook'}
        </p>
      )}
    </form>
  );
}

export function WebhooksTab({ owner, repo }: WebhooksTabProps) {
  const { data: webhooks, isLoading } = useWebhooks(owner, repo);
  const { mutate: deleteWebhook } = useDeleteWebhook();
  const [showForm, setShowForm] = useState(false);

  function handleDelete(id: number) {
    if (!window.confirm('Delete this webhook?')) return;
    deleteWebhook({ owner, repo, id });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Receive HTTP POST notifications for repository events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <WebhooksSkeleton />
          ) : !webhooks || webhooks.length === 0 ? (
            <EmptyState
              icon={Zap}
              title="No webhooks configured"
              description="Add a webhook to receive notifications when events happen in this repository."
            />
          ) : (
            <div className="divide-y divide-border">
              {webhooks.map((webhook) => (
                <WebhookItem key={webhook.id} webhook={webhook} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Webhook</CardTitle>
          </CardHeader>
          <CardContent>
            <AddWebhookForm
              owner={owner}
              repo={repo}
              onSuccess={() => setShowForm(false)}
            />
            <div className="mt-4">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Add Webhook
        </Button>
      )}
    </div>
  );
}
