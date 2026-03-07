'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GitBranch } from 'lucide-react';
import { useBranches, useRepository, useCreatePR } from '@/lib/api/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

export default function NewPullRequestPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const owner = params.owner;
  const repo = params.repo;
  const router = useRouter();

  const { data: branches, isLoading: branchesLoading } = useBranches(owner, repo);
  const { data: repository, isLoading: repoLoading } = useRepository(owner, repo);
  const createPR = useCreatePR();

  const isLoading = branchesLoading || repoLoading;
  const defaultBranch = repository?.default_branch ?? '';

  const [sourceBranch, setSourceBranch] = useState('');
  const [targetBranch, setTargetBranch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Once we have repo data, pre-fill target branch with the default
  const effectiveTarget = targetBranch || defaultBranch;

  const selectClass =
    'w-full bg-muted/30 border border-border/50 rounded-md px-3 py-2 text-sm text-foreground outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/50 transition-[color,box-shadow] disabled:opacity-50 disabled:cursor-not-allowed';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sourceBranch) {
      setError('Please select a source branch.');
      return;
    }
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    try {
      const pr = await createPR.mutateAsync({
        owner,
        repo,
        title: title.trim(),
        body: body.trim() || undefined,
        source_branch: sourceBranch,
        target_branch: effectiveTarget || undefined,
      });
      router.push(`/${owner}/${repo}/pulls/${pr.number}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to create pull request.';
      setError(message);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="rounded-xl border bg-card py-6 space-y-6">
          <div className="px-6 space-y-4">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-9 w-40 ml-auto" />
          </div>
        </div>
      </div>
    );
  }

  const branchList = branches ?? [];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold text-foreground mb-6">New Pull Request</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Open a pull request</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Source branch */}
            <div className="space-y-1.5">
              <Label htmlFor="source-branch" className="flex items-center gap-1.5">
                <GitBranch className="size-3.5 text-muted-foreground" />
                Source branch
              </Label>
              <select
                id="source-branch"
                value={sourceBranch}
                onChange={(e) => setSourceBranch(e.target.value)}
                className={selectClass}
                required
              >
                <option value="" disabled>
                  Select a branch…
                </option>
                {branchList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Target branch */}
            <div className="space-y-1.5">
              <Label htmlFor="target-branch" className="flex items-center gap-1.5">
                <GitBranch className="size-3.5 text-muted-foreground" />
                Target branch
              </Label>
              <select
                id="target-branch"
                value={effectiveTarget}
                onChange={(e) => setTargetBranch(e.target.value)}
                className={selectClass}
              >
                {branchList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                    {b === defaultBranch ? ' (default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-title">Title</Label>
              <Input
                id="pr-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="A brief summary of your changes"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="pr-body">
                Description{' '}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <textarea
                id="pr-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe what this pull request does…"
                className="w-full min-h-[120px] bg-transparent border border-input rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 transition-[color,box-shadow] dark:bg-input/30 resize-y"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* Submit */}
            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                disabled={createPR.isPending}
              >
                {createPR.isPending ? 'Creating…' : 'Create Pull Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
