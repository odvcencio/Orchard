'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowRightLeft, GitBranch, GitCompare } from 'lucide-react';
import { useBranches, useDiff, useRepository, useSemver } from '@/lib/api/hooks';
import type { DiffFile } from '@/lib/api/types';
import { DiffToggle } from '@/components/diff/diff-toggle';
import { EntityDiffView } from '@/components/diff/entity-diff-view';
import { LineDiffView } from '@/components/diff/line-diff-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

function BranchSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="relative">
        <GitBranch className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <select
          className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 text-sm text-foreground outline-none transition-colors focus:border-ring"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((branch) => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

export default function PublicComparePage() {
  const params = useParams<{ owner: string; repo: string }>();
  const owner = params.owner;
  const repo = params.repo;

  const [selectedBase, setSelectedBase] = useState<string | null>(null);
  const [selectedHead, setSelectedHead] = useState<string | null>(null);
  const [mode, setMode] = useState<'entity' | 'lines'>('entity');

  const { data: repository } = useRepository(owner, repo);
  const { data: branches, isLoading: branchesLoading } = useBranches(owner, repo);
  const branchList = branches ?? [];

  const defaultBranch = repository?.default_branch ?? branchList[0] ?? '';
  const base =
    selectedBase && branchList.includes(selectedBase)
      ? selectedBase
      : defaultBranch;
  const defaultHead = branchList.find((branch) => branch !== base) ?? defaultBranch;
  const head =
    selectedHead && branchList.includes(selectedHead)
      ? selectedHead
      : defaultHead;

  const canCompare = !!base && !!head && base !== head;
  const queryBase = canCompare ? base : '';
  const queryHead = canCompare ? head : '';
  const { data: diff, isLoading: diffLoading } = useDiff(owner, repo, queryBase, queryHead);
  const { data: semver } = useSemver(owner, repo, queryBase, queryHead);
  const files = (diff?.files ?? []) as DiffFile[];

  function swapBranches() {
    setSelectedBase(head || null);
    setSelectedHead(base || null);
  }

  return (
    <div className="space-y-5">
      <Card className="border-border/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-muted-foreground" />
            Compare branches
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {branchesLoading ? (
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : !branches || branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches available.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
              <BranchSelect
                label="Base"
                value={base}
                options={branchList}
                onChange={(value) => setSelectedBase(value)}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={swapBranches}
                aria-label="Swap branches"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <BranchSelect
                label="Head"
                value={head}
                options={branchList}
                onChange={(value) => setSelectedHead(value)}
              />
            </div>
          )}

          {canCompare && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono">{base}</span>
              <span>→</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-mono">{head}</span>
              {semver?.bump && (
                <span className="ml-auto rounded-full border border-border px-2 py-0.5 font-medium uppercase tracking-wide text-foreground">
                  Semver: {semver.bump}
                </span>
              )}
            </div>
          )}

          {!canCompare && (
            <p className="text-sm text-muted-foreground">
              Choose two different branches to view structural and line-level changes.
            </p>
          )}
        </CardContent>
      </Card>

      {canCompare && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {!diffLoading && files.length > 0
                ? `${files.length} ${files.length === 1 ? 'file' : 'files'} changed`
                : null}
            </p>
            <DiffToggle mode={mode} onChange={setMode} />
          </div>

          {mode === 'entity' ? (
            <EntityDiffView files={files} isLoading={diffLoading} />
          ) : (
            <LineDiffView files={files} isLoading={diffLoading} />
          )}
        </div>
      )}
    </div>
  );
}
