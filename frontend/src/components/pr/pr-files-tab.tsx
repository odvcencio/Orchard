'use client';

import { useState } from 'react';
import { DiffToggle } from '@/components/diff/diff-toggle';
import { EntityDiffView } from '@/components/diff/entity-diff-view';
import { LineDiffView } from '@/components/diff/line-diff-view';
import { usePRDiff } from '@/lib/api/hooks';
import type { DiffFile } from '@/lib/api/types';

interface PRFilesTabProps {
  owner: string;
  repo: string;
  prNumber: number;
}

export function PRFilesTab({ owner, repo, prNumber }: PRFilesTabProps) {
  const [mode, setMode] = useState<'entity' | 'lines'>('entity');
  const { data: diff, isLoading } = usePRDiff(owner, repo, prNumber);
  const files = (diff?.files ?? []) as DiffFile[];

  return (
    <div className="space-y-4">
      {/* Toggle bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {!isLoading && files.length > 0
            ? `${files.length} ${files.length === 1 ? 'file' : 'files'} changed`
            : null}
        </p>
        <DiffToggle mode={mode} onChange={setMode} />
      </div>

      {/* Diff view */}
      {mode === 'entity' ? (
        <EntityDiffView files={files} isLoading={isLoading} />
      ) : (
        <LineDiffView files={files} isLoading={isLoading} />
      )}
    </div>
  );
}
