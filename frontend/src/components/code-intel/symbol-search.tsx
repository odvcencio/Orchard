'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { EntityKindBadge } from '@/components/shared/entity-kind-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useSearchSymbols } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';
import type { SymbolResult } from '@/lib/api/types';

interface SymbolSearchProps {
  owner: string;
  repo: string;
  gitRef: string;
}

function SymbolRow({
  symbol,
  owner,
  repo,
  gitRef,
}: {
  symbol: SymbolResult;
  owner: string;
  repo: string;
  gitRef: string;
}) {
  const router = useRouter();
  const displayName = symbol.receiver
    ? `${symbol.receiver}.${symbol.name}`
    : symbol.name;
  const href = `/${owner}/${repo}/code/${symbol.file}?ref=${encodeURIComponent(gitRef)}#L${symbol.start_line}`;

  return (
    <button
      onClick={() => router.push(href)}
      className={cn(
        'w-full text-left rounded-md px-3 py-2.5 transition-colors',
        'hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
        'group',
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <EntityKindBadge
          kind={symbol.kind as Parameters<typeof EntityKindBadge>[0]['kind']}
          className="shrink-0"
        />
        <span className="font-mono text-sm text-foreground truncate font-medium">
          {displayName}
        </span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          L{symbol.start_line}–{symbol.end_line}
        </span>
      </div>
      <div className="mt-0.5 pl-0.5 flex items-center gap-2 min-w-0">
        <span className="text-xs text-muted-foreground truncate font-mono">
          {symbol.file}
        </span>
      </div>
      {symbol.signature && (
        <div className="mt-1 pl-0.5">
          <code className="text-xs text-muted-foreground/70 font-mono truncate block">
            {symbol.signature}
          </code>
        </div>
      )}
    </button>
  );
}

function SymbolRowSkeleton() {
  return (
    <div className="px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-12 ml-auto" />
      </div>
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

export function SymbolSearch({ owner, repo, gitRef }: SymbolSearchProps) {
  const [inputValue, setInputValue] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const { data: symbols, isLoading } = useSearchSymbols(
    owner,
    repo,
    gitRef,
    debouncedQuery || undefined,
  );

  const showSkeleton = isLoading && (debouncedQuery.length > 0 || symbols === undefined);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search symbols..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="pl-9"
          autoFocus
        />
      </div>

      <ScrollArea className="h-[480px]">
        {showSkeleton ? (
          <div className="space-y-px">
            {Array.from({ length: 6 }).map((_, i) => (
              <SymbolRowSkeleton key={i} />
            ))}
          </div>
        ) : !symbols || symbols.length === 0 ? (
          <EmptyState
            icon={Search}
            title={debouncedQuery ? 'No symbols found' : 'Start typing to search'}
            description={
              debouncedQuery
                ? `No symbols match "${debouncedQuery}"`
                : 'Enter a symbol name to search across this repository'
            }
          />
        ) : (
          <div className="space-y-px">
            {symbols.map((symbol, i) => (
              <SymbolRow
                key={`${symbol.file}:${symbol.name}:${i}`}
                symbol={symbol}
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
