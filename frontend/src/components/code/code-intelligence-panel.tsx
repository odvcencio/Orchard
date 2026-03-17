'use client';

import { X, FileCode, Link, History, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { RelativeTime as RelativeTimeText } from '@/components/shared/relative-time';
import { useSearchSymbols, useFindReferences, useEntityHistory } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';

export interface SymbolToken {
  name: string;
  kind?: string;
  line: number;
  col: number;
}

interface CodeIntelligencePanelProps {
  activeToken: SymbolToken | null;
  pinned: boolean;
  owner?: string;
  repo?: string;
  gitRef?: string;
  currentPath: string;
  onClear: () => void;
  intelligenceEnabled: boolean;
  disabledReason?: string;
}

function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

function PanelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 overflow-x-auto">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
        {title}
      </div>
      {children}
    </div>
  );
}

export function CodeIntelligencePanel({
  activeToken,
  pinned,
  owner,
  repo,
  gitRef,
  currentPath,
  onClear,
  intelligenceEnabled,
  disabledReason,
}: CodeIntelligencePanelProps) {
  const symbolName = activeToken?.name ?? '';
  const enabled = intelligenceEnabled && !!owner && !!repo && !!gitRef && !!symbolName;

  const { data: symbols, isLoading: symbolsLoading } = useSearchSymbols(
    owner ?? '',
    repo ?? '',
    gitRef ?? '',
    symbolName,
  );

  const { data: references, isLoading: refsLoading } = useFindReferences(
    owner ?? '',
    repo ?? '',
    gitRef ?? '',
    symbolName,
  );

  const { data: history, isLoading: historyLoading } = useEntityHistory(
    owner ?? '',
    repo ?? '',
    gitRef ?? '',
    { name: symbolName, limit: 8 },
  );

  if (!intelligenceEnabled) {
    return (
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2 text-muted-foreground text-xs">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>{disabledReason ?? 'Code intelligence not available'}</span>
        </div>
      </div>
    );
  }

  if (!activeToken) {
    return (
      <div className="px-3 py-4 text-xs text-muted-foreground text-center">
        Click a symbol to see definitions &amp; references
      </div>
    );
  }

  const definition = symbols?.find((s) => s.name === symbolName);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <code className="font-mono text-sm text-foreground truncate">{symbolName}</code>
          {activeToken.kind && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {activeToken.kind}
            </Badge>
          )}
          {pinned && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              pinned
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={onClear}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Definition */}
          <PanelSection title="Definition">
            {symbolsLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ) : definition ? (
              <div className="rounded-md bg-muted/30 px-2 py-1.5 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <FileCode className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-mono text-foreground/80 truncate">
                    {definition.file}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    L{definition.start_line}
                  </span>
                </div>
                {definition.signature && (
                  <code className="text-xs font-mono text-muted-foreground block truncate">
                    {definition.signature}
                  </code>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                {enabled ? 'No definition found' : 'Not available'}
              </div>
            )}
          </PanelSection>

          <Separator className="opacity-40" />

          {/* References */}
          <PanelSection title={`References${references ? ` (${references.length})` : ''}`}>
            {refsLoading ? (
              <div className="space-y-1.5">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
            ) : references && references.length > 0 ? (
              <ul className="space-y-1">
                {references.slice(0, 12).map((ref, i) => (
                  <li
                    key={i}
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 text-xs',
                      ref.file === currentPath
                        ? 'bg-primary/5 text-foreground'
                        : 'text-foreground/70 hover:bg-muted/30',
                    )}
                  >
                    <Link className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                    <span className="font-mono truncate flex-1">{ref.file}</span>
                    <span className="text-muted-foreground shrink-0">L{ref.start_line}</span>
                  </li>
                ))}
                {references.length > 12 && (
                  <li className="text-xs text-muted-foreground px-2 py-0.5">
                    +{references.length - 12} more
                  </li>
                )}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground">
                {enabled ? 'No references found' : 'Not available'}
              </div>
            )}
          </PanelSection>

          <Separator className="opacity-40" />

          {/* Entity history */}
          <PanelSection title="History">
            {historyLoading ? (
              <div className="space-y-1.5">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
            ) : history && history.length > 0 ? (
              <ul className="space-y-1">
                {history.slice(0, 8).map((hit, i) => (
                  <li key={i} className="rounded px-2 py-1.5 hover:bg-muted/30 space-y-0.5">
                    <div className="flex items-center gap-1.5 text-xs">
                      <History className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                      <code className="font-mono text-muted-foreground/80 shrink-0">
                        {shortHash(hit.commit_hash)}
                      </code>
                      <span className="text-muted-foreground ml-auto shrink-0">
                        <RelativeTimeText date={hit.timestamp * 1000} />
                      </span>
                    </div>
                    <div className="text-xs text-foreground/70 pl-4 truncate">{hit.message}</div>
                    <div className="text-[10px] text-muted-foreground/50 pl-4">{hit.author}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-xs text-muted-foreground">
                {enabled ? 'No history found' : 'Not available'}
              </div>
            )}
          </PanelSection>
        </div>
      </ScrollArea>
    </div>
  );
}
