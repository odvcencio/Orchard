'use client';

import Link from 'next/link';
import { FileCode, Link as LinkIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useFindReferences } from '@/lib/api/hooks';
import type { ReferenceResult } from '@/lib/api/types';

interface ReferenceListProps {
  owner: string;
  repo: string;
  gitRef: string;
  symbolName: string;
}

interface FileGroup {
  file: string;
  references: ReferenceResult[];
}

function groupByFile(references: ReferenceResult[]): FileGroup[] {
  const map = new Map<string, ReferenceResult[]>();
  for (const reference of references) {
    if (!map.has(reference.file)) {
      map.set(reference.file, []);
    }
    map.get(reference.file)!.push(reference);
  }
  return Array.from(map.entries()).map(([file, refs]) => ({ file, references: refs }));
}

function ReferenceItemSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

function FileGroupSkeleton() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-3 py-2">
        <Skeleton className="h-3.5 w-3.5 rounded" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-4 w-6 ml-auto rounded-full" />
      </div>
      <div className="space-y-px ml-3 border-l border-border/40 pl-3">
        <ReferenceItemSkeleton />
        <ReferenceItemSkeleton />
        <ReferenceItemSkeleton />
      </div>
    </div>
  );
}

function ReferenceItem({
  reference,
  owner,
  repo,
  gitRef,
}: {
  reference: ReferenceResult;
  owner: string;
  repo: string;
  gitRef: string;
}) {
  const href = `/${owner}/${repo}/code/${reference.file}?ref=${encodeURIComponent(gitRef)}#L${reference.start_line}`;

  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs transition-colors hover:bg-muted/40 group"
    >
      <LinkIcon className="h-3 w-3 text-muted-foreground/50 shrink-0 group-hover:text-muted-foreground" />
      <span className="text-muted-foreground font-mono shrink-0">
        {reference.start_line}:{reference.start_column}
      </span>
      <span className="text-foreground/70 truncate group-hover:text-foreground">
        {reference.name}
      </span>
    </Link>
  );
}

function FileGroupSection({
  group,
  owner,
  repo,
  gitRef,
}: {
  group: FileGroup;
  owner: string;
  repo: string;
  gitRef: string;
}) {
  const fileHref = `/${owner}/${repo}/code/${group.file}?ref=${encodeURIComponent(gitRef)}`;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/20">
        <FileCode className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Link
          href={fileHref}
          className="text-xs font-mono text-foreground/80 hover:text-foreground truncate flex-1 transition-colors"
        >
          {group.file}
        </Link>
        <span className="shrink-0 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {group.references.length}
        </span>
      </div>
      <div className="ml-3 border-l border-border/40 pl-3 space-y-px">
        {group.references.map((reference, i) => (
          <ReferenceItem
            key={`${reference.start_line}:${reference.start_column}:${i}`}
            reference={reference}
            owner={owner}
            repo={repo}
            gitRef={gitRef}
          />
        ))}
      </div>
    </div>
  );
}

export function ReferenceList({ owner, repo, gitRef, symbolName }: ReferenceListProps) {
  const { data: references, isLoading } = useFindReferences(owner, repo, gitRef, symbolName);

  const groups = references ? groupByFile(references) : [];
  const totalCount = references?.length ?? 0;

  return (
    <div className="flex flex-col gap-3">
      {!isLoading && references && references.length > 0 && (
        <div className="text-xs text-muted-foreground px-1">
          {totalCount} reference{totalCount !== 1 ? 's' : ''} across {groups.length} file
          {groups.length !== 1 ? 's' : ''}
        </div>
      )}

      <ScrollArea className="h-[480px]">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <FileGroupSkeleton key={i} />
            ))}
          </div>
        ) : !references || references.length === 0 ? (
          <EmptyState
            icon={LinkIcon}
            title="No references found"
            description={`No references to "${symbolName}" were found in this repository`}
          />
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <FileGroupSection
                key={group.file}
                group={group}
                owner={owner}
                repo={repo}
                gitRef={gitRef}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
