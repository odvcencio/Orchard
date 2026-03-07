'use client';

import { useState } from 'react';
import { Key, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/shared/relative-time';
import { EmptyState } from '@/components/shared/empty-state';
import { useSSHKeys, useCreateSSHKey, useDeleteSSHKey } from '@/lib/api/hooks';
import type { SSHKey } from '@/lib/api/types';

function SSHKeyItem({ sshKey, onDelete }: { sshKey: SSHKey; onDelete: (id: number) => void }) {
  const shortFingerprint =
    sshKey.fingerprint.length > 32
      ? sshKey.fingerprint.slice(0, 32) + '…'
      : sshKey.fingerprint;

  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <Key className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{sshKey.name}</span>
            <Badge variant="outline" className="text-xs">
              {sshKey.key_type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
            {shortFingerprint}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Added <RelativeTime date={sshKey.created_at} />
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(sshKey.id)}
        aria-label={`Delete SSH key ${sshKey.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AddSSHKeyForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const { mutate: createSSHKey, isPending, error } = useCreateSSHKey();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !publicKey.trim()) return;
    createSSHKey(
      { name: name.trim(), publicKey: publicKey.trim() },
      {
        onSuccess: () => {
          setName('');
          setPublicKey('');
          onSuccess();
        },
      },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ssh-key-name">Key name</Label>
        <Input
          id="ssh-key-name"
          placeholder="e.g. My Laptop"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isPending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ssh-public-key">Public key</Label>
        <textarea
          id="ssh-public-key"
          placeholder="Paste your public key here (ssh-ed25519 AAAA...)"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          disabled={isPending}
          rows={4}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : 'Failed to add SSH key'}
        </p>
      )}
      <Button type="submit" disabled={isPending || !name.trim() || !publicKey.trim()} className="gap-2">
        <Plus className="h-4 w-4" />
        {isPending ? 'Adding…' : 'Add SSH Key'}
      </Button>
    </form>
  );
}

function SSHKeysListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-3 py-3">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-56" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function SSHKeysTab() {
  const { data: sshKeys, isLoading } = useSSHKeys();
  const { mutate: deleteSSHKey } = useDeleteSSHKey();
  const [showForm, setShowForm] = useState(false);

  function handleDelete(id: number) {
    if (!window.confirm('Are you sure you want to delete this SSH key?')) return;
    deleteSSHKey(id);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SSH Keys</CardTitle>
          <CardDescription>
            SSH keys are used to authenticate Graft CLI operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SSHKeysListSkeleton />
          ) : !sshKeys || sshKeys.length === 0 ? (
            <EmptyState icon={Key} title="No SSH keys added" description="Add an SSH key to authenticate with the Graft CLI." />
          ) : (
            <div className="divide-y divide-border">
              {sshKeys.map((key) => (
                <SSHKeyItem key={key.id} sshKey={key} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add SSH Key</CardTitle>
          </CardHeader>
          <CardContent>
            <AddSSHKeyForm onSuccess={() => setShowForm(false)} />
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
          Add SSH Key
        </Button>
      )}
    </div>
  );
}
