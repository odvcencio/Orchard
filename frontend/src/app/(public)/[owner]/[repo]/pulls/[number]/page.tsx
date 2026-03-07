'use client';

import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PRHeader } from '@/components/pr/pr-header';
import { PRTimeline } from '@/components/pr/pr-timeline';
import { PRFilesTab } from '@/components/pr/pr-files-tab';
import { MergePreviewTab } from '@/components/pr/merge-preview-tab';
import { MergeGate } from '@/components/pr/merge-gate';
import { MarkdownPreview } from '@/components/shared/markdown-viewer';
import { usePullRequest } from '@/lib/api/hooks';

export default function PRDetailPage() {
  const params = useParams<{ owner: string; repo: string; number: string }>();
  const owner = params.owner;
  const repo = params.repo;
  const prNumber = parseInt(params.number, 10);

  const { data: pr, isLoading } = usePullRequest(owner, repo, prNumber);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5 py-4">
        <div className="space-y-2 border-b border-border/50 pb-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-7 flex-1 rounded" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-48 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-muted-foreground">Pull request not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-4">
      <PRHeader pr={pr} owner={owner} repo={repo} />

      {pr.body && (
        <div className="rounded-lg border border-border/50 bg-card px-4 py-3">
          <MarkdownPreview
            source={pr.body}
            className="text-sm leading-relaxed text-foreground/90 break-words"
          />
        </div>
      )}

      <MergeGate owner={owner} repo={repo} prNumber={prNumber} prState={pr.state} />

      <Tabs defaultValue="conversation">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="conversation">Conversation</TabsTrigger>
          <TabsTrigger value="files">Files changed</TabsTrigger>
          <TabsTrigger value="merge-preview">Merge preview</TabsTrigger>
        </TabsList>

        <TabsContent value="conversation" className="mt-4">
          <PRTimeline owner={owner} repo={repo} prNumber={prNumber} />
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <PRFilesTab owner={owner} repo={repo} prNumber={prNumber} />
        </TabsContent>

        <TabsContent value="merge-preview" className="mt-4">
          <MergePreviewTab owner={owner} repo={repo} prNumber={prNumber} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
