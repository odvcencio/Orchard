'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Star, GitFork, GitBranch, Folder, File, FileCode, Copy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReadmeSection } from '@/components/repo/readme-section';
import { useRepository, useTree, useRepoStars, useRepoForks, useBranches } from '@/lib/api/hooks';
import type { TreeEntry } from '@/lib/api/types';

// ── Clone URL helper ──────────────────────────────────────────────────────────

function CloneSection({ owner, repo }: { owner: string; repo: string }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const cloneUrl = `${origin}/${owner}/${repo}.git`;

  function handleCopy() {
    navigator.clipboard.writeText(cloneUrl).catch(() => {});
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Clone this repository</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 font-mono text-xs bg-muted/50 px-3 py-2 rounded text-muted-foreground truncate">
            {cloneUrl}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 p-2 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Copy clone URL"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── File listing table ────────────────────────────────────────────────────────

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'go', 'py', 'rs', 'java', 'c', 'cpp', 'h',
  'cs', 'rb', 'php', 'swift', 'kt', 'scala', 'sh', 'bash', 'zsh', 'fish',
  'yaml', 'yml', 'toml', 'json', 'xml', 'html', 'css', 'scss', 'sass',
  'md', 'mdx', 'sql', 'graphql', 'proto', 'lua', 'vim', 'el', 'clj',
]);

function isCodeFile(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return CODE_EXTENSIONS.has(ext);
}

interface FileListingProps {
  owner: string;
  repo: string;
  gitRef: string;
  entries: TreeEntry[];
}

function FileListing({ owner, repo, gitRef, entries }: FileListingProps) {
  const dirs = [...entries].filter((e) => e.is_dir).sort((a, b) => a.name.localeCompare(b.name));
  const files = [...entries].filter((e) => !e.is_dir).sort((a, b) => a.name.localeCompare(b.name));
  const sorted = [...dirs, ...files];

  function entryHref(entry: TreeEntry): string {
    const base = `/${owner}/${repo}/code/${entry.name}`;
    return entry.is_dir ? base : `${base}?ref=${encodeURIComponent(gitRef)}`;
  }

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-0 pt-3 px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" />
          <code className="font-mono text-xs">{gitRef}</code>
        </div>
      </CardHeader>
      <CardContent className="p-0 pt-1">
        <div className="divide-y divide-border/30">
          {sorted.map((entry) => {
            const icon = entry.is_dir ? (
              <Folder className="h-4 w-4 text-[hsl(38,92%,50%)] shrink-0" />
            ) : isCodeFile(entry.name) ? (
              <FileCode className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <File className="h-4 w-4 text-muted-foreground shrink-0" />
            );

            return (
              <Link
                key={entry.name}
                href={entryHref(entry)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted/30 transition-colors text-foreground/85 hover:text-foreground"
              >
                {icon}
                <span className="font-mono truncate">{entry.name}</span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Stats sidebar ─────────────────────────────────────────────────────────────

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
  href?: string;
}

function StatItem({ icon: Icon, label, value, href }: StatItemProps) {
  const content = (
    <>
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      {value === undefined ? (
        <Skeleton className="h-4 w-8" />
      ) : (
        <span className="text-sm text-foreground font-medium">{value}</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center gap-3 py-2 transition-colors hover:text-foreground">
        {content}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2">
      {content}
    </div>
  );
}

function StatsSidebar({ owner, repo, currentRef }: { owner: string; repo: string; currentRef: string }) {
  const { data: starsData } = useRepoStars(owner, repo);
  const { data: forks } = useRepoForks(owner, repo);
  const { data: branches } = useBranches(owner, repo);

  const starCount = starsData?.count;
  const forkCount = forks?.length;
  const branchCount = Array.isArray(branches) ? branches.length : undefined;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Repository Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y divide-border/50">
          <StatItem icon={Star} label="Stars" value={starCount} href={`/${owner}/${repo}/stargazers`} />
          <StatItem icon={GitFork} label="Forks" value={forkCount} href={`/${owner}/${repo}/forks`} />
          <StatItem icon={GitBranch} label="Branches" value={branchCount} />
        </div>
        <div className="mt-4 pt-4 border-t border-border/50 flex flex-col gap-1.5">
          <Link
            href={`/${owner}/${repo}/stargazers`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse stargazers
          </Link>
          <Link
            href={`/${owner}/${repo}/forks`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Browse forks
          </Link>
          <Link
            href={`/${owner}/${repo}/commits?ref=${encodeURIComponent(currentRef)}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Commits
          </Link>
          <Link
            href={`/${owner}/${repo}/compare`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Compare branches
          </Link>
          <Link
            href={`/${owner}/${repo}/pulls/new`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Open pull request
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 mt-2">
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

// ── Empty repo state ──────────────────────────────────────────────────────────

function EmptyRepo({ owner, repo, description }: { owner: string; repo: string; description: string }) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          <span className="text-muted-foreground">{owner}/</span>
          {repo}
        </h1>
        {description && (
          <p className="mt-1.5 text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="max-w-xl">
        <p className="text-muted-foreground mb-4 text-sm">
          This repository is empty. Clone it and push your first commit.
        </p>
        <CloneSection owner={owner} repo={repo} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PublicRepoPage() {
  const params = useParams<{ owner: string; repo: string }>();
  const searchParams = useSearchParams();
  const { owner, repo } = params;

  const { data: repoData, isLoading: repoLoading } = useRepository(owner, repo);
  const defaultBranch = repoData?.default_branch ?? '';
  const currentRef = searchParams.get('ref') ?? defaultBranch;

  const { data: tree, isLoading: treeLoading } = useTree(owner, repo, currentRef);

  if (repoLoading || (repoData && treeLoading)) {
    return <PageSkeleton />;
  }

  if (!repoData) {
    return (
      <div>
        <p className="text-muted-foreground">Repository not found.</p>
      </div>
    );
  }

  const hasContent = Array.isArray(tree) && tree.length > 0;

  if (!hasContent) {
    return (
      <EmptyRepo
        owner={owner}
        repo={repo}
        description={repoData.description}
      />
    );
  }

  return (
    <div className="space-y-5">
      {repoData.description && (
        <p className="text-sm text-muted-foreground">{repoData.description}</p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6">
        <div className="space-y-6">
          <FileListing
            owner={owner}
            repo={repo}
            gitRef={currentRef}
            entries={tree}
          />
          <ReadmeSection owner={owner} repo={repo} gitRef={currentRef} />
        </div>
        <div className="space-y-4">
          <StatsSidebar owner={owner} repo={repo} currentRef={currentRef} />
        </div>
      </div>
    </div>
  );
}
