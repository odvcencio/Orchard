'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EntityKindBadge } from '@/components/shared/entity-kind-badge';
import type { EntityInfo } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface EntityOutlineProps {
  entities: EntityInfo[];
  activeEntityKey?: string;
  onEntityClick?: (entity: EntityInfo) => void;
}

// Order in which kinds appear in the outline
const KIND_ORDER = ['type', 'interface', 'function', 'method', 'variable', 'preamble'];

function groupEntities(entities: EntityInfo[]): Map<string, EntityInfo[]> {
  const groups = new Map<string, EntityInfo[]>();
  for (const entity of entities) {
    const kind = entity.decl_kind || entity.kind || 'other';
    if (!groups.has(kind)) groups.set(kind, []);
    groups.get(kind)!.push(entity);
  }
  return groups;
}

function sortedKinds(groups: Map<string, EntityInfo[]>): string[] {
  const keys = Array.from(groups.keys());
  return keys.sort((a, b) => {
    const ai = KIND_ORDER.indexOf(a);
    const bi = KIND_ORDER.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

interface GroupSectionProps {
  kind: string;
  entities: EntityInfo[];
  activeEntityKey?: string;
  onEntityClick?: (entity: EntityInfo) => void;
}

function GroupSection({ kind, entities, activeEntityKey, onEntityClick }: GroupSectionProps) {
  const [open, setOpen] = useState(true);
  const badgeKind = kind as Parameters<typeof EntityKindBadge>[0]['kind'];

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 w-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-sm hover:bg-muted/50 group"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0" />
        )}
        <EntityKindBadge kind={badgeKind} />
        <span className="ml-auto text-xs text-muted-foreground/60 group-hover:text-muted-foreground">
          {entities.length}
        </span>
      </button>

      {open && (
        <ul className="mt-0.5 space-y-px">
          {entities.map((entity) => {
            const isActive = entity.key === activeEntityKey;
            return (
              <li key={entity.key}>
                <button
                  onClick={() => onEntityClick?.(entity)}
                  className={cn(
                    'flex items-center gap-2 w-full px-3 py-1 text-xs rounded-sm text-left transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground/80 hover:text-foreground hover:bg-muted/40',
                  )}
                >
                  <span className="truncate font-mono">
                    {entity.receiver ? `${entity.receiver}.${entity.name}` : entity.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function EntityOutline({ entities, activeEntityKey, onEntityClick }: EntityOutlineProps) {
  if (!entities || entities.length === 0) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
        No entities found
      </div>
    );
  }

  const groups = groupEntities(entities);
  const kinds = sortedKinds(groups);

  return (
    <ScrollArea className="h-full">
      <div className="py-2 px-1">
        {kinds.map((kind) => (
          <GroupSection
            key={kind}
            kind={kind}
            entities={groups.get(kind)!}
            activeEntityKey={activeEntityKey}
            onEntityClick={onEntityClick}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
