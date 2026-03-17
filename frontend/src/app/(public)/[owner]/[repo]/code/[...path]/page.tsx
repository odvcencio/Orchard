'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useRepository, useBlob } from '@/lib/api/hooks';
import { FileTree } from '@/components/code/file-tree';
import { CodeViewer } from '@/components/code/code-viewer';
import { MarkdownViewer } from '@/components/shared/markdown-viewer';
import { Skeleton } from '@/components/ui/skeleton';

interface BreadcrumbProps {
  owner: string;
  repo: string;
  segments: string[];
}

function Breadcrumb({ owner, repo, segments }: BreadcrumbProps) {
  const base = `/${owner}/${repo}/code`;

  return (
    <div className="flex items-center gap-1 text-sm flex-wrap min-w-0">
      <Link
        href={`/${owner}/${repo}`}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {repo}
      </Link>
      {segments.map((segment, idx) => {
        const href = `${base}/${segments.slice(0, idx + 1).join('/')}`;
        const isLast = idx === segments.length - 1;
        return (
          <span key={idx} className="flex items-center gap-1 min-w-0">
            <span className="text-muted-foreground/50">/</span>
            {isLast ? (
              <span className="text-foreground font-medium truncate">{segment}</span>
            ) : (
              <Link
                href={href}
                className="text-muted-foreground hover:text-foreground transition-colors truncate"
              >
                {segment}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}

function FileStatsBar({ source, filename }: { source: string; filename: string }) {
  const lines = source ? source.split('\n').length : 0;
  const bytes = new TextEncoder().encode(source).length;

  function formatBytes(n: number): string {
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 border-t border-border/50 text-xs text-muted-foreground shrink-0">
      <span>{lines.toLocaleString()} lines</span>
      <span>{formatBytes(bytes)}</span>
      {ext && <span className="uppercase font-mono">{ext}</span>}
    </div>
  );
}

function decodeBase64Utf8(encoded: string): string {
  const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isMarkdownFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.mdx');
}

export default function PublicCodeBrowserPage() {
  const params = useParams<{ owner: string; repo: string; path: string[] }>();
  const searchParams = useSearchParams();

  const owner = params.owner;
  const repo = params.repo;
  const segments: string[] = Array.isArray(params.path) ? params.path : [params.path];
  const filePath = segments.join('/');
  const filename = segments[segments.length - 1] ?? '';

  const refParam = searchParams.get('ref');
  const { data: repoData } = useRepository(owner, repo);
  const defaultBranch = repoData?.default_branch ?? 'main';
  const gitRef = refParam ?? defaultBranch;

  const { data: blobData, isLoading: blobLoading, isError: blobError } = useBlob(
    owner,
    repo,
    gitRef,
    filePath,
  );

  const isFile = !blobError && (blobLoading || !!blobData);
  const source = blobData?.data ? decodeBase64Utf8(blobData.data) : '';

  if (blobLoading && !blobData) {
    return (
      <div className="flex flex-col min-h-[68vh]">
        <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="p-4 space-y-2 font-mono">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-4" style={{ width: `${45 + (i * 11) % 50}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[68vh] rounded-xl border border-border/60 overflow-hidden bg-card">
      <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border/50 shrink-0 bg-muted/20">
        <Breadcrumb owner={owner} repo={repo} segments={segments} />
      </div>

      <div className="flex flex-1 min-h-0">
        {isFile ? (
          isMarkdownFile(filename) ? (
            <div className="flex-1 overflow-auto px-8 py-4 bg-card">
              <MarkdownViewer filename={filename} source={source} />
            </div>
          ) : (
            <CodeViewer
              source={source}
              owner={owner}
              repo={repo}
              gitRef={gitRef}
              path={filePath}
              highlights={blobData?.highlights}
              entities={blobData?.entities}
            />
          )
        ) : (
          <div className="flex-1 overflow-auto bg-card">
            <FileTree owner={owner} repo={repo} gitRef={gitRef} path={filePath} />
          </div>
        )}
      </div>

      {isFile && !blobLoading && source && (
        <FileStatsBar source={source} filename={filename} />
      )}
    </div>
  );
}
