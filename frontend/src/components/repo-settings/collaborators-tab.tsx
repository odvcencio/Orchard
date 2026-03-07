'use client';

import { useState } from 'react';
import { Users, Trash2, Plus, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useCollaborators, useAddCollaborator, useRemoveCollaborator } from '@/lib/api/hooks';
import type { Collaborator } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface CollaboratorsTabProps {
  owner: string;
  repo: string;
}

function roleBadgeClass(role: string): string {
  switch (role) {
    case 'admin':
      return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
    case 'write':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
}

function CollaboratorItem({
  collaborator,
  onRemove,
}: {
  collaborator: Collaborator;
  onRemove: (username: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <span className="text-xs font-medium text-muted-foreground">
            {collaborator.username.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{collaborator.username}</span>
            <Badge
              variant="outline"
              className={cn('text-xs capitalize', roleBadgeClass(collaborator.role))}
            >
              {collaborator.role}
            </Badge>
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(collaborator.username)}
        aria-label={`Remove collaborator ${collaborator.username}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function CollaboratorsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function AddCollaboratorForm({
  owner,
  repo,
  onSuccess,
}: {
  owner: string;
  repo: string;
  onSuccess: () => void;
}) {
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('write');
  const { mutate: addCollaborator, isPending, error } = useAddCollaborator();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    addCollaborator(
      { owner, repo, username: username.trim(), role },
      {
        onSuccess: () => {
          setUsername('');
          setRole('write');
          onSuccess();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-end">
        <div className="space-y-2">
          <Label htmlFor="collab-username">Username</Label>
          <Input
            id="collab-username"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isPending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="collab-role">Role</Label>
          <select
            id="collab-role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isPending}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="read">Read</option>
            <option value="write">Write</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <Button
          type="submit"
          disabled={isPending || !username.trim()}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to add collaborator'}
        </p>
      )}
    </form>
  );
}

export function CollaboratorsTab({ owner, repo }: CollaboratorsTabProps) {
  const { data: collaborators, isLoading } = useCollaborators(owner, repo);
  const { mutate: removeCollaborator } = useRemoveCollaborator();
  const [showForm, setShowForm] = useState(false);

  function handleRemove(username: string) {
    if (!window.confirm(`Remove ${username} as a collaborator?`)) return;
    removeCollaborator({ owner, repo, username });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Collaborators</CardTitle>
          <CardDescription>
            Manage who has access to this repository
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <CollaboratorsSkeleton />
          ) : !collaborators || collaborators.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No collaborators yet"
              description="Add collaborators to give them access to this repository."
            />
          ) : (
            <div className="divide-y divide-border">
              {collaborators.map((c) => (
                <CollaboratorItem
                  key={c.user_id}
                  collaborator={c}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Collaborator</CardTitle>
          </CardHeader>
          <CardContent>
            <AddCollaboratorForm
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
          <UserPlus className="h-4 w-4" />
          Add Collaborator
        </Button>
      )}
    </div>
  );
}
