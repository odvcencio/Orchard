'use client';

import { FileIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { DiffFile, DiffFileChange } from '@/lib/api/types';

interface LineDiffViewProps {
  files: DiffFile[];
  isLoading?: boolean;
}

const changePrefix = {
  added: '+',
  removed: '-',
  modified: '~',
} as const;

const changeTextColor = {
  added: 'text-emerald-400',
  removed: 'text-red-400',
  modified: 'text-amber-400',
} as const;

const changeBgColor = {
  added: 'bg-emerald-500/5',
  removed: 'bg-red-500/5',
  modified: 'bg-amber-500/5',
} as const;

function getPrefix(type: string): string {
  return changePrefix[type as keyof typeof changePrefix] ?? '~';
}

function getTextColor(type: string): string {
  return changeTextColor[type as keyof typeof changeTextColor] ?? 'text-amber-400';
}

function getBgColor(type: string): string {
  return changeBgColor[type as keyof typeof changeBgColor] ?? 'bg-amber-500/5';
}

function entityDisplayName(change: DiffFileChange): string {
  const entity = change.after ?? change.before;
  if (!entity) return change.key;
  return entity.receiver ? `${entity.receiver}.${entity.name}` : entity.name;
}

function ChangeRow({ change }: { change: DiffFileChange }) {
  const prefix = getPrefix(change.type);
  const textColor = getTextColor(change.type);
  const bgColor = getBgColor(change.type);
  const name = entityDisplayName(change);

  const hasSignatureDiff =
    change.type === 'modified' &&
    change.before?.signature !== undefined &&
    change.after?.signature !== undefined &&
    change.before.signature !== change.after.signature;

  return (
    <div className={cn('rounded text-xs font-mono', bgColor)}>
      <div className={cn('flex items-baseline gap-2 px-3 py-1.5', textColor)}>
        <span className="select-none w-3 shrink-0 text-center opacity-70">{prefix}</span>
        <span className="truncate">{name}</span>
        {change.type === 'modified' && !hasSignatureDiff && (
          <span className="ml-auto text-muted-foreground font-sans text-[10px] shrink-0">body changed</span>
        )}
      </div>

      {hasSignatureDiff && (
        <div className="px-3 pb-2 space-y-1">
          <div className="flex items-baseline gap-2 text-red-400/80">
            <span className="select-none w-3 shrink-0 text-center opacity-70">-</span>
            <pre className="whitespace-pre-wrap break-all text-[11px]">{change.before!.signature}</pre>
          </div>
          <div className="flex items-baseline gap-2 text-emerald-400/80">
            <span className="select-none w-3 shrink-0 text-center opacity-70">+</span>
            <pre className="whitespace-pre-wrap break-all text-[11px]">{change.after!.signature}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function FileSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
      <div className="p-3 space-y-1">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-7 w-full rounded" />
        ))}
      </div>
    </div>
  );
}

export function LineDiffView({ files, isLoading }: LineDiffViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
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

  return (
    <div className="space-y-4">
      {activeFiles.map((file) => (
        <div
          key={file.path}
          className="rounded-lg border border-border/50 bg-card overflow-hidden"
        >
          {/* File header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
            <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-mono text-sm text-foreground truncate">{file.path}</span>
          </div>

          {/* Diff-style rows */}
          <div className="p-3 space-y-px">
            {file.changes.map((change) => (
              <ChangeRow key={change.key} change={change} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
