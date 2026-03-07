'use client';

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import { useRepoIndexStatus } from '@/lib/api/hooks';
import type { EntityInfo, HighlightRange } from '@/lib/api/types';
import { BlameGutter, type BlameEntry } from './blame-gutter';
import { CodeIntelligencePanel, type SymbolToken } from './code-intelligence-panel';
import { cn } from '@/lib/utils';

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_INTERACTIVE_RANGES = 12000;
const LINE_HEIGHT_PX = 22;
const OVERSCAN_LINES = 80;

// ── Syntax colors ────────────────────────────────────────────────────────────

const CAPTURE_COLORS: Record<string, string> = {
  keyword: 'hsl(var(--code-syntax-keyword))',
  string: 'hsl(var(--code-syntax-string))',
  comment: 'hsl(var(--code-syntax-comment))',
  function: 'hsl(var(--code-syntax-function))',
  type: 'hsl(var(--code-syntax-type))',
  number: 'hsl(var(--code-syntax-number))',
  operator: 'hsl(var(--code-syntax-operator))',
  variable: 'hsl(var(--code-syntax-variable))',
  constant: 'hsl(var(--code-syntax-constant))',
  property: 'inherit',
  punctuation: 'inherit',
  tag: 'hsl(var(--code-syntax-tag))',
  attribute: 'hsl(var(--code-syntax-attribute))',
};

function captureColor(capture: string): string {
  // Capture names look like "keyword.return", "string.quoted", etc.
  // Match the first segment and tolerate tree-sitter style "@keyword".
  const base = capture.replace(/^@/, '').split('.')[0];
  return CAPTURE_COLORS[base] ?? 'inherit';
}

// ── Per-line content building ─────────────────────────────────────────────────

interface Span {
  text: string;
  color: string;
  capture: string;
}

interface StyledRange {
  start: number;
  end: number;
  color: string;
  capture: string;
}

/**
 * Build a 1-indexed array where index i holds the spans for line i.
 */
function buildPerLineContent(source: string, ranges: HighlightRange[]): Span[][] {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(source);

  // Normalize once to avoid O(lines*ranges) work with repeated mapping/filtering/sorting.
  const styledRanges: StyledRange[] = ranges
    .map((range) => {
      const color = captureColor(range.capture);
      if (color === 'inherit') return null;
      if (range.end_byte <= range.start_byte) return null;
      return {
        start: range.start_byte,
        end: range.end_byte,
        color,
        capture: range.capture,
      };
    })
    .filter((range): range is StyledRange => !!range)
    .sort((a, b) => (a.start === b.start ? a.end - b.end : a.start - b.start));

  // Split source into lines (keep newlines accounted for in byte offsets)
  const lineStartBytes: number[] = [0];
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0x0a) lineStartBytes.push(i + 1);
  }

  // For each line collect its text, then overlay spans
  const lineTexts: string[] = lineStartBytes.map((start, li) => {
    const end =
      li + 1 < lineStartBytes.length ? lineStartBytes[li + 1] - 1 : bytes.length;
    return decoder.decode(bytes.slice(start, end));
  });

  // Build result: lines[i] = array of spans for line (i+1, 1-indexed)
  let firstCandidate = 0;
  return lineTexts.map((lineText, lineIdx) => {
    if (!lineText) return [];

    const lineStart = lineStartBytes[lineIdx];
    const lineEnd =
      lineIdx + 1 < lineStartBytes.length
        ? lineStartBytes[lineIdx + 1] - 1
        : bytes.length;
    const lineLength = lineEnd - lineStart;
    if (lineLength <= 0) return [];

    while (firstCandidate < styledRanges.length && styledRanges[firstCandidate].end <= lineStart) {
      firstCandidate += 1;
    }

    const segments: StyledRange[] = [];
    for (let i = firstCandidate; i < styledRanges.length; i += 1) {
      const range = styledRanges[i];
      if (range.start >= lineEnd) break;
      if (range.end <= lineStart) continue;
      const start = Math.max(range.start, lineStart) - lineStart;
      const end = Math.min(range.end, lineEnd) - lineStart;
      if (end <= start) continue;
      segments.push({
        start,
        end,
        color: range.color,
        capture: range.capture,
      });
    }

    if (segments.length === 0) {
      return [{ text: lineText, color: 'inherit', capture: '' }];
    }

    const spans: Span[] = [];
    const lineBytes = bytes.slice(lineStart, lineEnd);
    let cursor = 0;

    for (const segment of segments) {
      if (segment.end <= cursor) continue;
      if (segment.start > cursor) {
        const plainText = decoder.decode(lineBytes.slice(cursor, segment.start));
        if (plainText) spans.push({ text: plainText, color: 'inherit', capture: '' });
      }

      const styleStart = Math.max(cursor, segment.start);
      const styledText = decoder.decode(lineBytes.slice(styleStart, segment.end));
      if (styledText) {
        spans.push({ text: styledText, color: segment.color, capture: segment.capture });
      }
      cursor = segment.end;
      if (cursor >= lineLength) break;
    }

    if (cursor < lineLength) {
      const tailText = decoder.decode(lineBytes.slice(cursor, lineLength));
      if (tailText) spans.push({ text: tailText, color: 'inherit', capture: '' });
    }

    return spans.length > 0 ? spans : [{ text: lineText, color: 'inherit', capture: '' }];
  });
}

// ── Entity boundary helpers ───────────────────────────────────────────────────

function entityAtLine(line: number, entities: EntityInfo[]): EntityInfo | undefined {
  return entities.find((e) => e.start_line <= line && line <= e.end_line);
}

function isEntityBoundary(line: number, entities: EntityInfo[]): boolean {
  // True when a new entity starts here (and it's not line 1)
  return line > 1 && entities.some((e) => e.start_line === line);
}

// ── Types ────────────────────────────────────────────────────────────────────

interface CodeViewerProps {
  source: string;
  owner?: string;
  repo?: string;
  gitRef?: string;
  path?: string;
  showBlame?: boolean;
  blameData?: BlameEntry[];
  highlights?: HighlightRange[];
  entities?: EntityInfo[];
  activeEntityKey?: string;
  onEntityVisible?: (key: string) => void;
}

// ── Line number cell ─────────────────────────────────────────────────────────

interface LineNumCellProps {
  lineNum: number;
  highlighted: boolean;
  onClick: (n: number) => void;
}

function LineNumCell({ lineNum, highlighted, onClick }: LineNumCellProps) {
  return (
    <td
      className={cn(
        'select-none text-right whitespace-nowrap cursor-pointer align-top',
        'w-[72px] min-w-[72px] max-w-[72px] pr-3 pl-2 border-r border-border/45 bg-muted/20',
        'text-xs font-mono [font-variant-numeric:tabular-nums]',
        highlighted
          ? 'text-primary bg-primary/12 border-primary/25'
          : 'text-muted-foreground/70 hover:text-foreground',
      )}
      onClick={() => onClick(lineNum)}
    >
      {lineNum}
    </td>
  );
}

// ── Code cell (one line) ─────────────────────────────────────────────────────

interface CodeLineProps {
  lineNum: number;
  spans: Span[];
  isEntityStart: boolean;
  isActiveEntity: boolean;
  isHighlighted: boolean;
  onTokenClick?: (token: SymbolToken) => void;
  onTokenHover?: (token: SymbolToken | null) => void;
}

function CodeLine({
  lineNum,
  spans,
  isEntityStart,
  isActiveEntity,
  isHighlighted,
  onTokenClick,
  onTokenHover,
}: CodeLineProps) {
  return (
    <td
      className={cn(
        'pr-8 pl-5 align-top whitespace-pre',
        isHighlighted && 'bg-primary/10',
        isActiveEntity && !isHighlighted && 'bg-primary/5',
      )}
    >
      {isEntityStart && (
        <div className="-ml-2 h-px bg-border/30 mb-0.5" aria-hidden="true" />
      )}
      {spans.map((span, i) => {
        const isInteractive = span.capture.startsWith('function') ||
          span.capture.startsWith('type') ||
          span.capture.startsWith('variable') ||
          span.capture.startsWith('property') ||
          span.capture.startsWith('attribute');

        if (isInteractive && onTokenClick) {
          return (
            <span
              key={i}
              style={{ color: span.color }}
              className="cursor-pointer hover:underline decoration-dotted underline-offset-2"
              onClick={(e) => {
                e.stopPropagation();
                onTokenClick({ name: span.text.trim(), kind: span.capture, line: lineNum, col: i });
              }}
              onMouseEnter={() =>
                onTokenHover?.({ name: span.text.trim(), kind: span.capture, line: lineNum, col: i })
              }
              onMouseLeave={() => onTokenHover?.(null)}
            >
              {span.text}
            </span>
          );
        }

        return (
          <span key={i} style={{ color: span.color }}>
            {span.text}
          </span>
        );
      })}
    </td>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CodeViewer({
  source,
  owner,
  repo,
  gitRef,
  path,
  showBlame = false,
  blameData,
  highlights = [],
  entities = [],
  activeEntityKey,
  onEntityVisible,
}: CodeViewerProps) {
  const [highlightedLine, setHighlightedLine] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const match = window.location.hash.match(/^#L(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  });
  const [activeToken, setActiveToken] = useState<SymbolToken | null>(null);
  const [pinnedToken, setPinnedToken] = useState<SymbolToken | null>(null);
  const [showIntelPanel, setShowIntelPanel] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollRafRef = useRef<number | null>(null);
  const initialHighlightedLineRef = useRef<number | null>(highlightedLine);

  // ── Index status for code intelligence availability ───────────────────────
  const { data: indexStatus } = useRepoIndexStatus(
    owner ?? '',
    repo ?? '',
    gitRef ?? '',
  );
  const intelligenceEnabled = !!indexStatus?.indexed;
  const disabledReason = indexStatus
    ? indexStatus.indexed
      ? undefined
      : `Index status: ${indexStatus.queue_status}`
    : 'Loading index status…';

  const lines = useMemo(() => {
    const split = source.split('\n');
    return source.endsWith('\n') ? split.slice(0, -1) : split;
  }, [source]);
  const lineCount = lines.length;

  const interactiveHighlightsEnabled = highlights.length <= MAX_INTERACTIVE_RANGES;
  const effectiveDisabledReason = !interactiveHighlightsEnabled
    ? `Inline intelligence is disabled for files with more than ${MAX_INTERACTIVE_RANGES.toLocaleString()} highlighted tokens.`
    : disabledReason;

  // ── Build per-line spans once per source/highlight update ─────────────────
  const perLineContent = useMemo(() => {
    if (highlights.length === 0) return null;
    return buildPerLineContent(source, highlights);
  }, [source, highlights]);

  // ── Scroll container metrics / virtualization state ───────────────────────
  const updateViewportMetrics = useCallback(() => {
    const node = scrollContainerRef.current;
    if (!node) return;
    setViewportHeight(node.clientHeight);
    setScrollTop(node.scrollTop);
  }, []);

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) return;

    updateViewportMetrics();
    const observer = new ResizeObserver(updateViewportMetrics);
    observer.observe(node);

    return () => {
      observer.disconnect();
      if (scrollRafRef.current != null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, [updateViewportMetrics]);

  const handleScroll = useCallback(() => {
    const node = scrollContainerRef.current;
    if (!node) return;
    if (scrollRafRef.current != null) return;

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const current = scrollContainerRef.current;
      if (!current) return;
      setScrollTop(current.scrollTop);
    });
  }, []);

  const scrollToLine = useCallback((line: number, behavior: ScrollBehavior = 'auto') => {
    const node = scrollContainerRef.current;
    if (!node || lineCount <= 0) return;
    const clamped = Math.max(1, Math.min(lineCount, line));
    const top = (clamped - 1) * LINE_HEIGHT_PX;
    node.scrollTo({ top, behavior });
  }, [lineCount]);

  const {
    topSpacerHeight,
    bottomSpacerHeight,
    visibleLineNumbers,
  } = useMemo(() => {
    if (lineCount <= 0) {
      return {
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
        visibleLineNumbers: [] as number[],
      };
    }

    const effectiveViewport = Math.max(viewportHeight, LINE_HEIGHT_PX * 20);
    const viewportLines = Math.max(1, Math.ceil(effectiveViewport / LINE_HEIGHT_PX));
    const firstVisibleIndex = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT_PX));
    const nextStartIndex = Math.max(0, firstVisibleIndex - OVERSCAN_LINES);
    const nextEndIndex = Math.min(
      lineCount - 1,
      firstVisibleIndex + viewportLines + OVERSCAN_LINES - 1,
    );

    const numbers = Array.from(
      { length: Math.max(0, nextEndIndex - nextStartIndex + 1) },
      (_, idx) => nextStartIndex + idx + 1,
    );
    const totalHeight = lineCount * LINE_HEIGHT_PX;
    const top = nextStartIndex * LINE_HEIGHT_PX;
    const bottom = Math.max(0, totalHeight - (nextEndIndex + 1) * LINE_HEIGHT_PX);

    return {
      topSpacerHeight: top,
      bottomSpacerHeight: bottom,
      visibleLineNumbers: numbers,
    };
  }, [lineCount, scrollTop, viewportHeight]);

  useEffect(() => {
    if (initialHighlightedLineRef.current == null) return;
    const n = initialHighlightedLineRef.current;
    initialHighlightedLineRef.current = null;
    requestAnimationFrame(() => {
      scrollToLine(n);
    });
  }, [scrollToLine]);

  // ── Entity visibility tracking (scroll-based, virtualization-friendly) ────
  useEffect(() => {
    if (!onEntityVisible || entities.length === 0 || lineCount <= 0) return;
    const centerLine = Math.max(
      1,
      Math.min(lineCount, Math.floor((scrollTop + viewportHeight * 0.45) / LINE_HEIGHT_PX) + 1),
    );
    const entity = entityAtLine(centerLine, entities);
    if (entity) onEntityVisible(entity.key);
  }, [entities, lineCount, onEntityVisible, scrollTop, viewportHeight]);

  // ── Scroll to entity when activeEntityKey changes ─────────────────────────
  useEffect(() => {
    if (!activeEntityKey) return;
    const entity = entities.find((e) => e.key === activeEntityKey);
    if (!entity) return;
    scrollToLine(entity.start_line, 'smooth');
  }, [activeEntityKey, entities, scrollToLine]);

  // ── Line click (highlight + #L{n} in URL) ─────────────────────────────────
  const handleLineNumClick = useCallback((n: number) => {
    setHighlightedLine((prev) => {
      const next = prev === n ? null : n;
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.hash = next == null ? '' : `L${next}`;
        window.history.replaceState(null, '', url.toString());
      }
      return next;
    });
  }, []);

  // ── Token interactions ────────────────────────────────────────────────────
  const handleTokenClick = useCallback((token: SymbolToken) => {
    if (token.name.length < 2) return; // skip single chars
    setPinnedToken(token);
    setActiveToken(token);
    setShowIntelPanel(true);
  }, []);

  const handleTokenHover = useCallback((token: SymbolToken | null) => {
    if (!pinnedToken) setActiveToken(token);
  }, [pinnedToken]);

  const handleIntelClear = useCallback(() => {
    setPinnedToken(null);
    setActiveToken(null);
    setShowIntelPanel(false);
  }, []);

  // ── Determine active entity key from hovered/pinned token or prop ─────────
  const resolvedActiveEntityKey = useMemo(() => {
    if (activeEntityKey) return activeEntityKey;
    if (activeToken) {
      return entityAtLine(activeToken.line, entities)?.key;
    }
    return undefined;
  }, [activeEntityKey, activeToken, entities]);

  return (
    <div className="flex h-full overflow-hidden bg-[hsl(var(--code-bg))] text-[hsl(var(--code-fg))]">
      {/* Code table */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto"
      >
        <table
          className="w-full border-collapse text-sm font-mono bg-[hsl(var(--code-bg))]"
          style={{
            tableLayout: 'fixed',
          }}
        >
          <tbody>
            {topSpacerHeight > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={showBlame ? 3 : 2}
                  style={{ height: topSpacerHeight, padding: 0, border: 0 }}
                />
              </tr>
            )}
            {visibleLineNumbers.map((lineNum) => {
              const lineIdx = lineNum - 1;
              const defaultLine = lines[lineIdx] ?? '';
              const spans = perLineContent?.[lineIdx] ?? (
                defaultLine
                  ? [{ text: defaultLine, color: 'inherit', capture: '' }]
                  : []
              );
              const isHighlighted = highlightedLine === lineNum;
              const isBoundary = isEntityBoundary(lineNum, entities);
              const lineEntity = entityAtLine(lineNum, entities);
              const isActiveEntity = !!lineEntity && lineEntity.key === resolvedActiveEntityKey;

              return (
                <tr
                  key={lineNum}
                  data-line={lineNum}
                  className={cn(
                    'group',
                    isHighlighted && 'bg-primary/10',
                    isActiveEntity && !isHighlighted && 'bg-primary/5',
                  )}
                  style={{ height: LINE_HEIGHT_PX }}
                >
                  {showBlame && <BlameGutter lineNum={lineNum} blameData={blameData} />}
                  <LineNumCell
                    lineNum={lineNum}
                    highlighted={isHighlighted}
                    onClick={handleLineNumClick}
                  />
                  <CodeLine
                    lineNum={lineNum}
                    spans={spans}
                    isEntityStart={isBoundary}
                    isActiveEntity={isActiveEntity}
                    isHighlighted={isHighlighted}
                    onTokenClick={intelligenceEnabled && interactiveHighlightsEnabled ? handleTokenClick : undefined}
                    onTokenHover={intelligenceEnabled && interactiveHighlightsEnabled ? handleTokenHover : undefined}
                  />
                </tr>
              );
            })}
            {bottomSpacerHeight > 0 && (
              <tr aria-hidden="true">
                <td
                  colSpan={showBlame ? 3 : 2}
                  style={{ height: bottomSpacerHeight, padding: 0, border: 0 }}
                />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Code intelligence panel */}
      {showIntelPanel && (
        <div
          className="w-72 shrink-0 border-l border-border/50 flex flex-col overflow-hidden bg-[hsl(var(--code-panel-bg))]"
        >
          <CodeIntelligencePanel
            activeToken={activeToken}
            pinned={!!pinnedToken}
            owner={owner}
            repo={repo}
            gitRef={gitRef}
            currentPath={path ?? ''}
            onClear={handleIntelClear}
            intelligenceEnabled={intelligenceEnabled}
            disabledReason={effectiveDisabledReason}
          />
        </div>
      )}
    </div>
  );
}
