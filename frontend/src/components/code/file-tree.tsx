'use client';

import Link from 'next/link';
import { Folder, File, FileCode } from 'lucide-react';
import { useTree } from '@/lib/api/hooks';
import { Skeleton } from '@/components/ui/skeleton';

interface FileTreeProps {
  owner: string;
  repo: string;
  gitRef: string;
  path?: string;
}

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

export function FileTree({ owner, repo, gitRef, path }: FileTreeProps) {
  const { data, isLoading } = useTree(owner, repo, gitRef, path);

  const basePath = `/${owner}/${repo}/code`;

  function entryHref(name: string, isDir: boolean): string {
    const segments = [basePath];
    if (path) segments.push(path);
    segments.push(name);
    const href = segments.join('/');
    return isDir ? href : `${href}?ref=${encodeURIComponent(gitRef)}`;
  }

  if (isLoading) {
    return (
      <div className="py-2 px-3 space-y-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-7" style={{ width: `${50 + (i * 13) % 40}%` }} />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        Empty directory
      </div>
    );
  }

  // Sort: directories first (alphabetical), then files (alphabetical)
  const dirs = [...data].filter((e) => e.is_dir).sort((a, b) => a.name.localeCompare(b.name));
  const files = [...data].filter((e) => !e.is_dir).sort((a, b) => a.name.localeCompare(b.name));
  const sorted = [...dirs, ...files];

  return (
    <div className="py-1">
      {sorted.map((entry) => {
        const href = entryHref(entry.name, entry.is_dir);
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
            href={href}
            className="flex items-center gap-2.5 px-4 py-1.5 text-sm hover:bg-muted/40 transition-colors text-foreground/85 hover:text-foreground"
          >
            {icon}
            <span className="font-mono truncate">{entry.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
