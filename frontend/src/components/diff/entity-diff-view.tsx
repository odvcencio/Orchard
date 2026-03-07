'use client';

import { FileIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EntityChangeCard } from './entity-change-card';
import type { DiffFile } from '@/lib/api/types';

interface EntityDiffViewProps {
  files: DiffFile[];
  isLoading?: boolean;
}

function countByType(files: DiffFile[]) {
  let added = 0;
  let modified = 0;
  let removed = 0;
  for (const file of files) {
    for (const change of file.changes) {
      if (change.type === 'added') added++;
      else if (change.type === 'modified') modified++;
      else if (change.type === 'removed') removed++;
    }
  }
  return { added, modified, removed };
}

function FileSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-48 rounded" />
        <Skeleton className="ml-auto h-5 w-8 rounded-full" />
      </div>
      <div className="p-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2">
            <Skeleton className="h-3.5 w-3.5 rounded" />
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="ml-auto h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function EntityDiffView({ files, isLoading }: EntityDiffViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <FileSkeleton />
        <FileSkeleton />
      </div>
    );
  }

  const activeFiles = files.filter((f) => f.changes && f.changes.length > 0);

  if (activeFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No entity-level changes detected.</p>
      </div>
    );
  }

  const { added, modified, removed } = countByType(activeFiles);
  const totalFiles = activeFiles.length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">
          {totalFiles} {totalFiles === 1 ? 'file' : 'files'} changed
        </span>
        <span className="text-border/80">·</span>
        {added > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/70" />
            <span className="text-emerald-400">{added} added</span>
          </span>
        )}
        {modified > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500/70" />
            <span className="text-amber-400">{modified} modified</span>
          </span>
        )}
        {removed > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-red-500/70" />
            <span className="text-red-400">{removed} removed</span>
          </span>
        )}
      </div>

      {/* File cards */}
      {activeFiles.map((file) => (
        <div
          key={file.path}
          className="rounded-lg border border-border/50 bg-card overflow-hidden"
        >
          {/* File header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono text-sm text-foreground truncate flex-1">{file.path}</span>
            <Badge variant="outline" className="shrink-0 text-xs border-border/50 text-muted-foreground">
              {file.changes.length}
            </Badge>
          </div>

          {/* Entity changes */}
          <div className="p-3 space-y-1.5">
            {file.changes.map((change) => (
              <EntityChangeCard key={change.key} change={change} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
