'use client';

import { useParams } from 'next/navigation';
import { Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { GeneralTab } from '@/components/repo-settings/general-tab';
import { CollaboratorsTab } from '@/components/repo-settings/collaborators-tab';
import { BranchProtectionTab } from '@/components/repo-settings/branch-protection-tab';
import { WebhooksTab } from '@/components/repo-settings/webhooks-tab';
import { DangerZoneTab } from '@/components/repo-settings/danger-zone-tab';
import { useRepository } from '@/lib/api/hooks';

function PageSkeleton() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 rounded-md" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

export default function RepoSettingsPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const { owner, repo } = params;

  const { data: repoData, isLoading } = useRepository(owner, repo);

  if (isLoading) {
    return <PageSkeleton />;
  }

  const defaultBranch = repoData?.default_branch ?? 'main';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Repository Settings</h1>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-transparent p-0 mb-6">
          <TabsTrigger value="general" className="text-sm">
            General
          </TabsTrigger>
          <TabsTrigger value="collaborators" className="text-sm">
            Collaborators
          </TabsTrigger>
          <TabsTrigger value="branch-protection" className="text-sm">
            Branch Protection
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="text-sm">
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="danger" className="text-sm">
            Danger Zone
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab owner={owner} repo={repo} />
        </TabsContent>

        <TabsContent value="collaborators">
          <CollaboratorsTab owner={owner} repo={repo} />
        </TabsContent>

        <TabsContent value="branch-protection">
          <BranchProtectionTab
            owner={owner}
            repo={repo}
            defaultBranch={defaultBranch}
          />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhooksTab owner={owner} repo={repo} />
        </TabsContent>

        <TabsContent value="danger">
          <DangerZoneTab owner={owner} repo={repo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
