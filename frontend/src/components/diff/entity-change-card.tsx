'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { EntityKindBadge } from '@/components/shared/entity-kind-badge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DiffFileChange } from '@/lib/api/types';

interface EntityChangeCardProps {
  change: DiffFileChange;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const changeTypeConfig = {
  added: {
    borderClass: 'border-l-emerald-500/50',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-transparent',
    label: 'added',
  },
  modified: {
    borderClass: 'border-l-amber-500/50',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-transparent',
    label: 'modified',
  },
  removed: {
    borderClass: 'border-l-red-500/50',
    badgeClass: 'bg-red-500/15 text-red-400 border-transparent',
    label: 'removed',
  },
} as const;

function getChangeConfig(type: string) {
  return changeTypeConfig[type as keyof typeof changeTypeConfig] ?? changeTypeConfig.modified;
}

function lineCount(entity: { start_line: number; end_line: number }) {
  return Math.max(0, entity.end_line - entity.start_line);
}

export function EntityChangeCard({ change, expanded: controlledExpanded, onToggleExpand }: EntityChangeCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);

  const isControlled = controlledExpanded !== undefined;
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  function handleToggle() {
    if (isControlled) {
      onToggleExpand?.();
    } else {
      setInternalExpanded((v) => !v);
    }
  }

  const config = getChangeConfig(change.type);
  const entity = change.after ?? change.before;
  const entityName = entity
    ? entity.receiver
      ? `${entity.receiver}.${entity.name}`
      : entity.name
    : change.key;

  const entityKind = entity?.decl_kind ?? entity?.kind ?? 'function';

  const hasSignatureDiff =
    change.type === 'modified' &&
    change.before?.signature !== undefined &&
    change.after?.signature !== undefined &&
    change.before.signature !== change.after.signature;

  const lineDelta =
    change.type === 'modified' && change.before && change.after
      ? lineCount(change.after) - lineCount(change.before)
      : null;

  return (
    <div
      className={cn(
        'border-l-2 rounded-r-md bg-muted/20 transition-colors',
        config.borderClass,
      )}
    >
      <button
        onClick={handleToggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors rounded-r-md"
      >
        <span className="shrink-0 text-muted-foreground/60">
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </span>

        <EntityKindBadge
          kind={entityKind as Parameters<typeof EntityKindBadge>[0]['kind']}
          className="shrink-0"
        />

        <span className="font-mono text-sm text-foreground truncate flex-1">
          {entityName}
        </span>

        <div className="flex items-center gap-2 shrink-0">
          {lineDelta !== null && (
            <span
              className={cn(
                'text-xs font-mono',
                lineDelta > 0 ? 'text-emerald-400' : lineDelta < 0 ? 'text-red-400' : 'text-muted-foreground',
              )}
            >
              {lineDelta > 0 ? `+${lineDelta}` : lineDelta} lines
            </span>
          )}
          <Badge
            className={cn('text-xs capitalize', config.badgeClass)}
          >
            {config.label}
          </Badge>
        </div>
      </button>

      {expanded && (hasSignatureDiff || change.type !== 'modified') && (
        <div className="px-3 pb-3 pt-1 space-y-2">
          {change.type === 'added' && change.after?.signature && (
            <div className="rounded bg-emerald-500/5 border border-emerald-500/20 p-2">
              <p className="text-xs text-muted-foreground mb-1">Signature</p>
              <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap break-all">
                {change.after.signature}
              </pre>
            </div>
          )}

          {change.type === 'removed' && change.before?.signature && (
            <div className="rounded bg-red-500/5 border border-red-500/20 p-2">
              <p className="text-xs text-muted-foreground mb-1">Signature</p>
              <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap break-all">
                {change.before.signature}
              </pre>
            </div>
          )}

          {hasSignatureDiff && (
            <div className="space-y-1.5">
              <div className="rounded bg-red-500/5 border border-red-500/20 p-2">
                <p className="text-xs text-muted-foreground mb-1">Before</p>
                <pre className="font-mono text-xs text-red-400 whitespace-pre-wrap break-all">
                  {change.before!.signature}
                </pre>
              </div>
              <div className="rounded bg-emerald-500/5 border border-emerald-500/20 p-2">
                <p className="text-xs text-muted-foreground mb-1">After</p>
                <pre className="font-mono text-xs text-emerald-400 whitespace-pre-wrap break-all">
                  {change.after!.signature}
                </pre>
              </div>
            </div>
          )}

          {change.type === 'modified' && !hasSignatureDiff && (
            <p className="text-xs text-muted-foreground italic">
              Body changed, signature unchanged.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
