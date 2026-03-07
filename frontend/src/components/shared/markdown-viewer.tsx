'use client';

import { useEffect, useMemo, useState } from 'react';
import { highlightSnippet } from '@/lib/api/client';
import type { HighlightRange } from '@/lib/api/types';

interface MarkdownViewerProps {
  filename: string;
  source: string;
  className?: string;
}

type ViewMode = 'preview' | 'raw';
type ListType = 'ordered' | 'unordered';
type InlineMatchType = 'code' | 'link' | 'strong' | 'em' | 'strike';

interface InlineMatch {
  type: InlineMatchType;
  index: number;
  raw: string;
  content: string;
  href?: string;
}

interface FenceStart {
  markerChar: '`' | '~';
  markerLength: number;
  language: string;
}

const headingPattern = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
const orderedListPattern = /^ {0,3}(\d+)[.)]\s+(.+)$/;
const unorderedListPattern = /^ {0,3}[-+*]\s+(.+)$/;
const quotePattern = /^ {0,3}>\s?(.*)$/;
const horizontalRulePattern = /^ {0,3}((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/;
const continuationLinePattern = /^( {2,}|\t+)\S/;
const safeSchemePattern = /^([A-Za-z][A-Za-z0-9+.-]*):/;

const headingClasses: Record<number, string> = {
  1: 'text-3xl font-bold text-foreground border-b border-border/50 pb-2 mb-3.5',
  2: 'text-2xl font-semibold text-foreground border-b border-border/50 pb-1.5 mb-3',
  3: 'text-xl font-semibold text-foreground mb-2.5',
  4: 'text-lg font-medium text-foreground mb-2',
  5: 'text-base font-medium text-foreground mb-2',
  6: 'text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2',
};

const MAX_MARKDOWN_HIGHLIGHTED_BYTES = 180 * 1024;
const MAX_MARKDOWN_CACHE_ENTRIES = 64;

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

const markdownHighlightCache = new Map<string, HighlightRange[]>();
const markdownHighlightPending = new Map<string, Promise<HighlightRange[]>>();

interface CodeSpan {
  text: string;
  color: string;
}

interface StyledRange {
  start: number;
  end: number;
  color: string;
}

function textFingerprint(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16);
}

function lruGet<T>(map: Map<string, T>, key: string): T | undefined {
  const value = map.get(key);
  if (value === undefined) return undefined;
  map.delete(key);
  map.set(key, value);
  return value;
}

function lruSet<T>(map: Map<string, T>, key: string, value: T): void {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  if (map.size <= MAX_MARKDOWN_CACHE_ENTRIES) return;
  const oldestKey = map.keys().next().value as string | undefined;
  if (oldestKey) map.delete(oldestKey);
}

function captureColor(capture: string): string {
  const base = capture.replace(/^@/, '').split('.')[0];
  return CAPTURE_COLORS[base] ?? 'inherit';
}

function buildHighlightedCodeLines(source: string, ranges: HighlightRange[]): CodeSpan[][] {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(source);

  const styledRanges: StyledRange[] = ranges
    .map((range) => {
      const color = captureColor(range.capture);
      if (color === 'inherit') return null;
      if (range.end_byte <= range.start_byte) return null;
      return {
        start: range.start_byte,
        end: range.end_byte,
        color,
      };
    })
    .filter((range): range is StyledRange => !!range)
    .sort((a, b) => (a.start === b.start ? a.end - b.end : a.start - b.start));

  const lineStartBytes: number[] = [0];
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x0a) lineStartBytes.push(i + 1);
  }

  const lineTexts = lineStartBytes.map((start, idx) => {
    const end = idx + 1 < lineStartBytes.length ? lineStartBytes[idx + 1] - 1 : bytes.length;
    return decoder.decode(bytes.slice(start, end));
  });

  let firstCandidate = 0;
  return lineTexts.map((lineText, lineIdx) => {
    const lineStart = lineStartBytes[lineIdx];
    const lineEnd =
      lineIdx + 1 < lineStartBytes.length ? lineStartBytes[lineIdx + 1] - 1 : bytes.length;
    const lineLength = lineEnd - lineStart;

    if (lineLength <= 0) return [{ text: '', color: 'inherit' }];

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
      segments.push({ start, end, color: range.color });
    }

    if (!lineText || segments.length === 0) {
      return [{ text: lineText, color: 'inherit' }];
    }

    const lineBytes = bytes.slice(lineStart, lineEnd);
    const spans: CodeSpan[] = [];
    let cursor = 0;

    for (const segment of segments) {
      if (segment.end <= cursor) continue;
      if (segment.start > cursor) {
        const plainText = decoder.decode(lineBytes.slice(cursor, segment.start));
        if (plainText) spans.push({ text: plainText, color: 'inherit' });
      }
      const styleStart = Math.max(cursor, segment.start);
      const highlighted = decoder.decode(lineBytes.slice(styleStart, segment.end));
      if (highlighted) spans.push({ text: highlighted, color: segment.color });
      cursor = segment.end;
      if (cursor >= lineLength) break;
    }

    if (cursor < lineLength) {
      const tail = decoder.decode(lineBytes.slice(cursor, lineLength));
      if (tail) spans.push({ text: tail, color: 'inherit' });
    }

    return spans.length > 0 ? spans : [{ text: lineText, color: 'inherit' }];
  });
}

function languageToVirtualFilename(language: string): string | null {
  const lang = language.trim().toLowerCase();
  if (!lang) return null;

  const directMap: Record<string, string> = {
    go: 'snippet.go',
    golang: 'snippet.go',
    js: 'snippet.js',
    javascript: 'snippet.js',
    ts: 'snippet.ts',
    typescript: 'snippet.ts',
    tsx: 'snippet.tsx',
    jsx: 'snippet.jsx',
    py: 'snippet.py',
    python: 'snippet.py',
    rb: 'snippet.rb',
    ruby: 'snippet.rb',
    rs: 'snippet.rs',
    rust: 'snippet.rs',
    sh: 'snippet.sh',
    bash: 'snippet.sh',
    zsh: 'snippet.sh',
    shell: 'snippet.sh',
    java: 'snippet.java',
    c: 'snippet.c',
    cc: 'snippet.cpp',
    cpp: 'snippet.cpp',
    cxx: 'snippet.cpp',
    'c++': 'snippet.cpp',
    cs: 'snippet.cs',
    csharp: 'snippet.cs',
    php: 'snippet.php',
    swift: 'snippet.swift',
    kt: 'snippet.kt',
    kotlin: 'snippet.kt',
    scala: 'snippet.scala',
    lua: 'snippet.lua',
    sql: 'snippet.sql',
    html: 'snippet.html',
    css: 'snippet.css',
    scss: 'snippet.scss',
    xml: 'snippet.xml',
    json: 'snippet.json',
    yaml: 'snippet.yaml',
    yml: 'snippet.yaml',
    toml: 'snippet.toml',
    ini: 'snippet.ini',
    md: 'snippet.md',
    markdown: 'snippet.md',
    diff: 'snippet.diff',
    patch: 'snippet.diff',
    dockerfile: 'Dockerfile',
    makefile: 'Makefile',
    make: 'Makefile',
  };

  if (directMap[lang]) return directMap[lang];

  const ext = lang.replace(/[^a-z0-9+_-]/g, '');
  if (!ext) return null;
  return `snippet.${ext}`;
}

async function fetchMarkdownHighlights(filename: string, code: string): Promise<HighlightRange[]> {
  const cacheKey = `${filename}:${code.length}:${textFingerprint(code)}`;
  const cached = lruGet(markdownHighlightCache, cacheKey);
  if (cached) return cached;

  const pending = markdownHighlightPending.get(cacheKey);
  if (pending) return pending;

  const next = highlightSnippet(filename, code)
    .then((result) => {
      const ranges = result.highlights ?? [];
      lruSet(markdownHighlightCache, cacheKey, ranges);
      return ranges;
    })
    .finally(() => {
      markdownHighlightPending.delete(cacheKey);
    });

  markdownHighlightPending.set(cacheKey, next);
  return next;
}

function MarkdownCodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [ranges, setRanges] = useState<HighlightRange[]>([]);
  const filename = useMemo(() => languageToVirtualFilename(language), [language]);
  const codeBytes = useMemo(() => new TextEncoder().encode(code).length, [code]);
  const canHighlight = !!filename && !!code && codeBytes <= MAX_MARKDOWN_HIGHLIGHTED_BYTES;

  useEffect(() => {
    if (!canHighlight || !filename) {
      return;
    }

    let cancelled = false;
    fetchMarkdownHighlights(filename, code)
      .then((nextRanges) => {
        if (cancelled) return;
        setRanges(nextRanges);
      })
      .catch(() => {
        if (cancelled) return;
        setRanges([]);
      });

    return () => {
      cancelled = true;
    };
  }, [canHighlight, filename, code]);

  const effectiveRanges = useMemo(() => (canHighlight ? ranges : []), [canHighlight, ranges]);
  const lines = useMemo(() => buildHighlightedCodeLines(code, effectiveRanges), [code, effectiveRanges]);

  return (
    <pre className="m-0 p-3 overflow-x-auto font-mono text-sm leading-relaxed bg-[hsl(220,20%,7%)]">
      <code>
        {lines.map((line, lineIdx) => (
          <span key={lineIdx}>
            {line.map((span, spanIdx) => (
              <span key={spanIdx} style={{ color: span.color }}>
                {span.text}
              </span>
            ))}
            {lineIdx < lines.length - 1 ? '\n' : null}
          </span>
        ))}
      </code>
    </pre>
  );
}

export function MarkdownViewer({ filename, source, className }: MarkdownViewerProps) {
  return (
    <MarkdownViewerContent
      key={filename}
      source={source}
      className={className}
    />
  );
}

export function MarkdownPreview({
  source,
  className,
  emptyMessage = 'Nothing written yet.',
}: {
  source: string;
  className?: string;
  emptyMessage?: string;
}) {
  const renderedPreview = useMemo(() => renderMarkdownBlocks(source, 'md-preview'), [source]);

  return (
    <article className={className}>
      {renderedPreview.length > 0 ? (
        renderedPreview
      ) : emptyMessage ? (
        <p className="m-0 text-muted-foreground">{emptyMessage}</p>
      ) : null}
    </article>
  );
}

function MarkdownViewerContent({
  source,
  className,
}: Omit<MarkdownViewerProps, 'filename'>) {
  const [mode, setMode] = useState<ViewMode>('preview');
  const renderedPreview = useMemo(() => renderMarkdownBlocks(source, 'md'), [source]);

  return (
    <div className={className}>
      <div className="border border-border/50 rounded-lg overflow-hidden bg-card">
        <div className="flex justify-between items-center px-3 py-2.5 border-b border-border/50 bg-muted/30">
          <strong className="text-foreground text-[13px]">Markdown</strong>
          <div className="flex gap-1 text-xs">
            <ModeButton label="Preview" active={mode === 'preview'} onClick={() => setMode('preview')} />
            <ModeButton label="Raw" active={mode === 'raw'} onClick={() => setMode('raw')} />
          </div>
        </div>

        {mode === 'preview' ? (
          <article className="p-4 text-sm leading-relaxed text-foreground break-words">
            {renderedPreview.length > 0 ? (
              renderedPreview
            ) : (
              <p className="m-0 text-muted-foreground">Empty markdown file.</p>
            )}
          </article>
        ) : (
          <div className="p-3">
            <pre className="m-0 p-3 overflow-x-auto font-mono text-sm leading-relaxed bg-[hsl(220,20%,7%)] rounded-md text-foreground">
              <code>{source}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function ModeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? 'rounded px-2.5 py-1 bg-primary/20 text-primary'
          : 'rounded px-2.5 py-1 text-muted-foreground hover:text-foreground'
      }
    >
      {label}
    </button>
  );
}

function renderMarkdownBlocks(source: string, keyPrefix: string): React.ReactElement[] {
  const normalized = source.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const nodes: React.ReactElement[] = [];

  let lineIndex = 0;
  let blockIndex = 0;

  while (lineIndex < lines.length) {
    const line = lines[lineIndex] || '';
    if (line.trim() === '') {
      lineIndex += 1;
      continue;
    }

    const fence = parseFenceStart(line);
    if (fence) {
      lineIndex += 1;
      const codeLines: string[] = [];
      while (lineIndex < lines.length && !isFenceEnd(lines[lineIndex] || '', fence)) {
        codeLines.push(lines[lineIndex] || '');
        lineIndex += 1;
      }
      if (lineIndex < lines.length) lineIndex += 1;

      nodes.push(
        <figure key={`${keyPrefix}-code-${blockIndex}`} className="mb-3.5 border border-border/50 rounded-lg overflow-hidden">
          {fence.language && (
            <figcaption className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 border-b border-border/50">
              {fence.language}
            </figcaption>
          )}
          <MarkdownCodeBlock language={fence.language} code={codeLines.join('\n')} />
        </figure>,
      );
      blockIndex += 1;
      continue;
    }

    const heading = headingPattern.exec(line);
    if (heading) {
      const level = Math.min(6, (heading[1] || '').length);
      const headingText = heading[2] || '';
      nodes.push(renderHeading(level, renderInline(headingText, `${keyPrefix}-h-${blockIndex}`), `${keyPrefix}-h-${blockIndex}`));
      blockIndex += 1;
      lineIndex += 1;
      continue;
    }

    if (horizontalRulePattern.test(line)) {
      nodes.push(<hr key={`${keyPrefix}-hr-${blockIndex}`} className="border-0 border-t border-border/50 my-4" />);
      blockIndex += 1;
      lineIndex += 1;
      continue;
    }

    if (quotePattern.test(line)) {
      const quoteLines: string[] = [];
      while (lineIndex < lines.length) {
        const quoteMatch = quotePattern.exec(lines[lineIndex] || '');
        if (!quoteMatch) break;
        quoteLines.push(quoteMatch[1] || '');
        lineIndex += 1;
      }

      nodes.push(
        <blockquote key={`${keyPrefix}-quote-${blockIndex}`} className="mb-3.5 pl-3 border-l-2 border-border/50 text-muted-foreground">
          {renderMarkdownBlocks(quoteLines.join('\n'), `${keyPrefix}-quote-${blockIndex}`)}
        </blockquote>,
      );
      blockIndex += 1;
      continue;
    }

    const orderedList = orderedListPattern.exec(line);
    const unorderedList = unorderedListPattern.exec(line);
    if (orderedList || unorderedList) {
      const listType: ListType = orderedList ? 'ordered' : 'unordered';
      const { node, nextIndex } = consumeList(lines, lineIndex, listType, `${keyPrefix}-list-${blockIndex}`);
      nodes.push(node);
      blockIndex += 1;
      lineIndex = nextIndex;
      continue;
    }

    const paragraphLines: string[] = [];
    while (lineIndex < lines.length) {
      const nextLine = lines[lineIndex] || '';
      if (nextLine.trim() === '' || isBlockStart(nextLine)) break;
      paragraphLines.push(nextLine.trim());
      lineIndex += 1;
    }

    const paragraphText = paragraphLines.join(' ').replace(/\s+/g, ' ').trim();
    if (paragraphText) {
      nodes.push(
        <p key={`${keyPrefix}-p-${blockIndex}`} className="mb-3.5">
          {renderInline(paragraphText, `${keyPrefix}-p-${blockIndex}`)}
        </p>,
      );
      blockIndex += 1;
    } else {
      lineIndex += 1;
    }
  }

  return nodes;
}

function consumeList(
  lines: string[],
  startIndex: number,
  listType: ListType,
  keyPrefix: string,
): { node: React.ReactElement; nextIndex: number } {
  const items: React.ReactElement[] = [];
  const itemPattern = listType === 'ordered' ? orderedListPattern : unorderedListPattern;

  let lineIndex = startIndex;
  let itemIndex = 0;
  let orderedStart = 1;

  while (lineIndex < lines.length) {
    const match = itemPattern.exec(lines[lineIndex] || '');
    if (!match) break;

    const parts: string[] = [];
    if (listType === 'ordered') {
      if (itemIndex === 0) orderedStart = Number(match[1]) || 1;
      parts.push(match[2] || '');
    } else {
      parts.push(match[1] || '');
    }
    lineIndex += 1;

    while (lineIndex < lines.length) {
      const nextLine = lines[lineIndex] || '';
      if (nextLine.trim() === '') break;
      if (itemPattern.test(nextLine)) break;
      if (isBlockStart(nextLine) && !continuationLinePattern.test(nextLine)) break;
      if (continuationLinePattern.test(nextLine)) {
        parts.push(nextLine.trim());
        lineIndex += 1;
        continue;
      }
      break;
    }

    const text = parts.join(' ').replace(/\s+/g, ' ').trim();
    items.push(
      <li key={`${keyPrefix}-item-${itemIndex}`}>
        {renderInline(text, `${keyPrefix}-item-${itemIndex}`)}
      </li>,
    );
    itemIndex += 1;
  }

  if (listType === 'ordered') {
    return {
      node: (
        <ol
          key={keyPrefix}
          className="mb-3.5 ml-[22px] space-y-1.5 list-decimal"
          start={orderedStart > 1 ? orderedStart : undefined}
        >
          {items}
        </ol>
      ),
      nextIndex: lineIndex,
    };
  }

  return {
    node: (
      <ul key={keyPrefix} className="mb-3.5 ml-[22px] space-y-1.5 list-disc">
        {items}
      </ul>
    ),
    nextIndex: lineIndex,
  };
}

function renderHeading(level: number, children: React.ReactNode, key: string): React.ReactElement {
  const safeLevel = Math.min(6, Math.max(1, level));
  const className = headingClasses[safeLevel] ?? (headingClasses[3] as string);

  if (safeLevel === 1) return <h1 key={key} className={className}>{children}</h1>;
  if (safeLevel === 2) return <h2 key={key} className={className}>{children}</h2>;
  if (safeLevel === 3) return <h3 key={key} className={className}>{children}</h3>;
  if (safeLevel === 4) return <h4 key={key} className={className}>{children}</h4>;
  if (safeLevel === 5) return <h5 key={key} className={className}>{children}</h5>;
  return <h6 key={key} className={className}>{children}</h6>;
}

function renderInline(text: string, keyPrefix: string, depth = 0): React.ReactNode[] {
  if (!text) return [];
  if (depth > 8) return [text];

  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let chunkIndex = 0;

  while (remaining.length > 0) {
    const next = findFirstInlineMatch(remaining);
    if (!next) {
      nodes.push(remaining);
      break;
    }

    if (next.index > 0) {
      nodes.push(remaining.slice(0, next.index));
    }

    const key = `${keyPrefix}-inline-${chunkIndex}`;
    if (next.type === 'code') {
      nodes.push(
        <code key={key} className="font-mono bg-muted/40 border border-border/40 rounded px-1 text-[0.92em]">
          {next.content}
        </code>,
      );
    } else if (next.type === 'link') {
      const href = sanitizeHref(next.href || '');
      const linkChildren = renderInline(next.content, `${key}-link`, depth + 1);
      if (href) {
        const external = /^https?:\/\//i.test(href);
        nodes.push(
          <a
            key={key}
            href={href}
            className="text-primary hover:underline"
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
          >
            {linkChildren}
          </a>,
        );
      } else {
        nodes.push(
          <span key={key} className="text-muted-foreground">
            {linkChildren}
          </span>,
        );
      }
    } else if (next.type === 'strong') {
      nodes.push(
        <strong key={key} className="font-semibold text-foreground">
          {renderInline(next.content, `${key}-strong`, depth + 1)}
        </strong>,
      );
    } else if (next.type === 'em') {
      nodes.push(
        <em key={key} className="italic">
          {renderInline(next.content, `${key}-em`, depth + 1)}
        </em>,
      );
    } else if (next.type === 'strike') {
      nodes.push(
        <del key={key} className="line-through text-muted-foreground">
          {renderInline(next.content, `${key}-strike`, depth + 1)}
        </del>,
      );
    }

    if (next.raw.length === 0) {
      nodes.push(remaining);
      break;
    }

    remaining = remaining.slice(next.index + next.raw.length);
    chunkIndex += 1;
  }

  return nodes;
}

function findFirstInlineMatch(text: string): InlineMatch | null {
  const matches: InlineMatch[] = [];

  const code = /`([^`\n]+)`/.exec(text);
  if (code) {
    matches.push({
      type: 'code',
      index: code.index,
      raw: code[0],
      content: code[1] || '',
    });
  }

  const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(text);
  if (link) {
    matches.push({
      type: 'link',
      index: link.index,
      raw: link[0],
      content: link[1] || '',
      href: link[2] || '',
    });
  }

  const strong = /\*\*([^*]+)\*\*|__([^_]+)__/.exec(text);
  if (strong) {
    matches.push({
      type: 'strong',
      index: strong.index,
      raw: strong[0],
      content: strong[1] || strong[2] || '',
    });
  }

  const emphasis = /\*([^*\n]+)\*|_([^_\n]+)_/.exec(text);
  if (emphasis) {
    matches.push({
      type: 'em',
      index: emphasis.index,
      raw: emphasis[0],
      content: emphasis[1] || emphasis[2] || '',
    });
  }

  const strike = /~~([^~]+)~~/.exec(text);
  if (strike) {
    matches.push({
      type: 'strike',
      index: strike.index,
      raw: strike[0],
      content: strike[1] || '',
    });
  }

  if (matches.length === 0) return null;

  matches.sort(
    (left, right) => left.index - right.index || inlineTypePriority(left.type) - inlineTypePriority(right.type),
  );
  return matches[0] ?? null;
}

function inlineTypePriority(type: InlineMatchType): number {
  if (type === 'code') return 0;
  if (type === 'link') return 1;
  if (type === 'strong') return 2;
  if (type === 'em') return 3;
  return 4;
}

function sanitizeHref(rawHref: string): string | null {
  const trimmed = rawHref.trim();
  if (!trimmed) return null;

  const href =
    trimmed.startsWith('<') && trimmed.endsWith('>') ? trimmed.slice(1, -1).trim() : trimmed;
  if (!href) return null;

  if (href.startsWith('#')) return href;
  if (/^(\/|\.\/|\.\.\/)/.test(href)) return href;

  const scheme = safeSchemePattern.exec(href);
  if (!scheme) return href;

  const protocol = `${(scheme[1] || '').toLowerCase()}:`;
  if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') return href;
  return null;
}

function parseFenceStart(line: string): FenceStart | null {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if (!match) return null;

  const marker = match[1] || '';
  const markerChar = marker.startsWith('~') ? '~' : '`';
  const markerLength = marker.length;
  const language = ((match[2] || '').trim().split(/\s+/)[0] || '').toLowerCase();

  return { markerChar, markerLength, language };
}

function isFenceEnd(line: string, fence: FenceStart): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed[0] !== fence.markerChar) return false;

  let count = 0;
  while (count < trimmed.length && trimmed[count] === fence.markerChar) count += 1;
  if (count < fence.markerLength) return false;

  for (let i = count; i < trimmed.length; i += 1) {
    if (!/\s/.test(trimmed[i] || '')) return false;
  }
  return true;
}

function isBlockStart(line: string): boolean {
  return !!(
    line.trim() === '' ||
    parseFenceStart(line) ||
    headingPattern.test(line) ||
    orderedListPattern.test(line) ||
    unorderedListPattern.test(line) ||
    quotePattern.test(line) ||
    horizontalRulePattern.test(line)
  );
}
