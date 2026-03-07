'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDeleteRepo } from '@/lib/api/hooks';

interface DangerZoneTabProps {
  owner: string;
  repo: string;
}

export function DangerZoneTab({ owner, repo }: DangerZoneTabProps) {
  const router = useRouter();
  const [confirmInput, setConfirmInput] = useState('');
  const { mutate: deleteRepo, isPending, error } = useDeleteRepo();

  const fullName = `${owner}/${repo}`;
  const isConfirmed = confirmInput === fullName;

  function handleDelete() {
    if (!isConfirmed) return;
    deleteRepo(
      { owner, repo },
      {
        onSuccess: () => {
          router.push('/dashboard');
        },
      },
    );
  }

  return (
    <Card className="border-red-500/50 bg-red-500/5">
      <CardHeader>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
        </div>
        <CardDescription>
          These actions are irreversible. Please be careful.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border border-red-500/30 p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Delete this repository</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Once deleted, this repository and all its data — including code, pull requests, issues,
              and webhooks — will be permanently removed and cannot be recovered.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-repo-name" className="text-sm">
              Type{' '}
              <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded text-foreground">
                {fullName}
              </code>{' '}
              to confirm
            </Label>
            <Input
              id="confirm-repo-name"
              placeholder={fullName}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={isPending}
              className="border-red-500/30 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to delete repository'}
            </p>
          )}

          <Button
            variant="destructive"
            className="gap-2"
            disabled={!isConfirmed || isPending}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? 'Deleting…' : 'Delete this repository'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
