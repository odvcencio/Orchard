'use client';

import type { ReactNode } from 'react';
import { FileText, AlertTriangle, CheckCircle, PlusCircle, MinusCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMergePreview } from '@/lib/api/hooks';
import type { MergePreviewFile } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface MergePreviewTabProps {
  owner: string;
  repo: string;
  prNumber: number;
}

const fileStatusConfig: Record<
  string,
  { label: string; className: string; icon: ReactNode }
> = {
  clean: {
    label: 'Clean',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  conflict: {
    label: 'Conflict',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  added: {
    label: 'Added',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    icon: <PlusCircle className="h-3.5 w-3.5" />,
  },
  deleted: {
    label: 'Deleted',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
    icon: <MinusCircle className="h-3.5 w-3.5" />,
  },
};

function FileRow({ file }: { file: MergePreviewFile }) {
  const config = fileStatusConfig[file.status] ?? fileStatusConfig.clean;
  const isConflict = file.status === 'conflict';

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5',
        isConflict
          ? 'border-red-500/30 bg-red-500/5'
          : 'border-border/50 bg-card',
      )}
    >
      <FileText
        className={cn(
          'h-4 w-4 shrink-0',
          isConflict ? 'text-red-400' : 'text-muted-foreground',
        )}
      />
      <span
        className={cn(
          'flex-1 min-w-0 truncate font-mono text-sm',
          isConflict ? 'text-red-300' : 'text-foreground',
        )}
      >
        {file.path}
      </span>
      {isConflict && file.conflict_count > 0 && (
        <span className="text-xs text-red-400 font-medium shrink-0">
          {file.conflict_count} {file.conflict_count === 1 ? 'conflict' : 'conflicts'}
        </span>
      )}
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium shrink-0',
          config.className,
        )}
      >
        {config.icon}
        {config.label}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: 'red' | 'green' | 'amber';
}) {
  const colorCls =
    highlight === 'red'
      ? 'text-red-400'
      : highlight === 'green'
        ? 'text-emerald-400'
        : highlight === 'amber'
          ? 'text-amber-400'
          : 'text-foreground';

  return (
    <div className="rounded-lg border border-border/50 bg-card px-4 py-3 text-center">
      <p className={cn('text-2xl font-semibold tabular-nums', colorCls)}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-10 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export function MergePreviewTab({ owner, repo, prNumber }: MergePreviewTabProps) {
  const { data: preview, isLoading } = useMergePreview(owner, repo, prNumber);

  if (isLoading) return <LoadingSkeleton />;

  if (!preview) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Could not load merge preview.
      </p>
    );
  }

  const { stats, files, has_conflicts, conflict_count } = preview;

  return (
    <div className="space-y-5">
      {/* Conflict banner */}
      {has_conflicts && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-300 font-medium">
            This PR has {conflict_count} {conflict_count === 1 ? 'conflict' : 'conflicts'} that
            must be resolved before merging.
          </p>
        </div>
      )}

      {!has_conflicts && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-300 font-medium">
            This branch can be merged cleanly with no conflicts.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total entities" value={stats.total_entities} />
        <StatCard label="Unchanged" value={stats.unchanged} />
        <StatCard
          label="Conflicts"
          value={stats.conflicts}
          highlight={stats.conflicts > 0 ? 'red' : undefined}
        />
        <StatCard
          label="Both modified"
          value={stats.both_modified}
          highlight={stats.both_modified > 0 ? 'amber' : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Added" value={stats.added} highlight={stats.added > 0 ? 'green' : undefined} />
        <StatCard label="Deleted" value={stats.deleted} />
        <StatCard label="Ours modified" value={stats.ours_modified} />
        <StatCard label="Theirs modified" value={stats.theirs_modified} />
      </div>

      {/* File list */}
      {files && files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            Files ({files.length})
          </h3>
          <div className="space-y-1.5">
            {files.map((file) => (
              <FileRow key={file.path} file={file} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
