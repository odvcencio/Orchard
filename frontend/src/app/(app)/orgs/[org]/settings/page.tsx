'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrgMembersTab } from '@/components/orgs/org-members-tab';
import { useDeleteOrg } from '@/lib/api/hooks';

function DangerZoneTab({ org }: { org: string }) {
  const router = useRouter();
  const [confirmInput, setConfirmInput] = useState('');
  const { mutate: deleteOrg, isPending, error } = useDeleteOrg();

  const isConfirmed = confirmInput === org;

  function handleDelete() {
    if (!isConfirmed) return;
    deleteOrg(org, {
      onSuccess: () => {
        router.push('/dashboard');
      },
    });
  }

  return (
    <Card className="border-red-500/50 bg-red-500/5">
      <CardHeader>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <CardTitle className="text-red-400">Danger Zone</CardTitle>
        </div>
        <CardDescription>These actions are irreversible. Please be careful.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md border border-red-500/30 p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Delete this organization</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Once deleted, this organization and all its data — including repositories, members,
              and settings — will be permanently removed and cannot be recovered.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-org-name" className="text-sm">
              Type{' '}
              <code className="text-xs font-mono bg-muted px-1 py-0.5 rounded text-foreground">
                {org}
              </code>{' '}
              to confirm
            </Label>
            <Input
              id="confirm-org-name"
              placeholder={org}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              disabled={isPending}
              className="border-red-500/30 focus-visible:border-red-500/60 focus-visible:ring-red-500/20"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error instanceof Error ? error.message : 'Failed to delete organization'}
            </p>
          )}

          <Button
            variant="destructive"
            className="gap-2"
            disabled={!isConfirmed || isPending}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4" />
            {isPending ? 'Deleting…' : 'Delete this organization'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OrgSettingsPage() {
  const params = useParams<{ org: string }>();
  const { org } = params;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Organization Settings</h1>
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="danger">Danger Zone</TabsTrigger>
        </TabsList>
        <TabsContent value="members" className="mt-6">
          <OrgMembersTab org={org} />
        </TabsContent>
        <TabsContent value="danger" className="mt-6">
          <DangerZoneTab org={org} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
