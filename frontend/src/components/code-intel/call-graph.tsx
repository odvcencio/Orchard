'use client';

import Link from 'next/link';
import { ArrowUpToLine, ArrowDownToLine, GitFork } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useCallGraph } from '@/lib/api/hooks';
import type { CallGraphEdge } from '@/lib/api/types';

interface CallGraphProps {
  owner: string;
  repo: string;
  gitRef: string;
  symbol: string;
}

function EdgeItemSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md">
      <Skeleton className="h-4 w-24 font-mono" />
      <Skeleton className="h-3 w-40" />
      <Skeleton className="h-4 w-6 ml-auto rounded-full" />
    </div>
  );
}

function SectionSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1 py-1.5">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="space-y-px">
        {Array.from({ length: count }).map((_, i) => (
          <EdgeItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

function EdgeItem({
  name,
  file,
  count,
  owner,
  repo,
  gitRef,
}: {
  name: string;
  file: string;
  count: number;
  owner: string;
  repo: string;
  gitRef: string;
}) {
  const href = `/${owner}/${repo}/code/${file}?ref=${encodeURIComponent(gitRef)}`;

  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors hover:bg-muted/40 group"
    >
      <span className="font-mono text-foreground/90 font-medium shrink-0 group-hover:text-foreground">
        {name}
      </span>
      <span className="text-muted-foreground font-mono truncate flex-1">{file}</span>
      {count > 1 && (
        <Badge
          variant="secondary"
          className="shrink-0 text-[10px] px-1.5 py-0 h-4 ml-auto"
        >
          {count}×
        </Badge>
      )}
    </Link>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="px-3 py-2 text-xs text-muted-foreground">
      No {label} found
    </div>
  );
}

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  edges: CallGraphEdge[];
  nameKey: 'caller_name' | 'callee_name';
  fileKey: 'caller_file' | 'callee_file';
  owner: string;
  repo: string;
  gitRef: string;
}

function CallSection({ title, icon, edges, nameKey, fileKey, owner, repo, gitRef }: SectionProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 px-1 py-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        <span className="text-xs text-muted-foreground/60 ml-1">({edges.length})</span>
      </div>

      {edges.length === 0 ? (
        <EmptySection label={title.toLowerCase()} />
      ) : (
        <div className="space-y-px">
          {edges.map((edge, i) => (
            <EdgeItem
              key={`${edge[nameKey]}:${edge[fileKey]}:${i}`}
              name={edge[nameKey]}
              file={edge[fileKey]}
              count={edge.count}
              owner={owner}
              repo={repo}
              gitRef={gitRef}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CallGraph({ owner, repo, gitRef, symbol }: CallGraphProps) {
  const { data, isLoading } = useCallGraph(owner, repo, gitRef, symbol);

  const callers = data?.edges.filter((e) => e.callee_name === symbol) ?? [];
  const callees = data?.edges.filter((e) => e.caller_name === symbol) ?? [];

  return (
    <ScrollArea className="h-[520px]">
      <div className="space-y-6 p-1">
        {isLoading ? (
          <>
            <SectionSkeleton count={3} />
            <SectionSkeleton count={4} />
          </>
        ) : !data ? (
          <EmptyState
            icon={GitFork}
            title="No call graph data"
            description={`No call graph information is available for "${symbol}"`}
          />
        ) : (
          <>
            <CallSection
              title="Callers"
              icon={<ArrowUpToLine className="h-4 w-4" />}
              edges={callers}
              nameKey="caller_name"
              fileKey="caller_file"
              owner={owner}
              repo={repo}
              gitRef={gitRef}
            />
            <CallSection
              title="Callees"
              icon={<ArrowDownToLine className="h-4 w-4" />}
              edges={callees}
              nameKey="callee_name"
              fileKey="callee_file"
              owner={owner}
              repo={repo}
              gitRef={gitRef}
            />
          </>
        )}
      </div>
    </ScrollArea>
  );
}
