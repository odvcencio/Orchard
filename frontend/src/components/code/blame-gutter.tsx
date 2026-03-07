'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { EntityBlameInfo } from '@/lib/api/types';

export interface BlameEntry {
  start_line: number;
  end_line?: number;
  commit_hash: string;
  author: string;
  timestamp: number;
  message: string;
}

interface BlameGutterProps {
  lineNum: number;
  blameData?: BlameEntry[];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

export function BlameGutter({ lineNum, blameData }: BlameGutterProps) {
  if (!blameData || blameData.length === 0) {
    return <td className="w-[140px] min-w-[140px] select-none" />;
  }

  // Show blame info at the start_line of each blame entry
  const entry = blameData.find((b) => b.start_line === lineNum);

  if (!entry) {
    return <td className="w-[140px] min-w-[140px] select-none" />;
  }

  const firstLine = entry.message.split('\n')[0];
  const truncated = firstLine.length > 40 ? firstLine.slice(0, 40) + '…' : firstLine;

  return (
    <td className="w-[140px] min-w-[140px] select-none border-r border-border/30 pr-2 pl-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <span
              className="font-mono text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors shrink-0"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {shortHash(entry.commit_hash)}
            </span>
            <span className="text-[10px] text-muted-foreground/50 truncate hidden sm:block">
              {entry.author.split(' ')[0]}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="max-w-xs font-mono text-xs"
        >
          <div className="space-y-0.5">
            <div className="font-semibold">{entry.author}</div>
            <div className="text-muted-foreground">{formatDate(entry.timestamp)}</div>
            <div className="text-foreground/80 mt-1">{truncated}</div>
            <div className="text-muted-foreground/60 text-[10px] mt-1">
              {entry.commit_hash}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </td>
  );
}

// Adapter: convert EntityBlameInfo[] to BlameEntry[]
export function adaptEntityBlame(infos: EntityBlameInfo[]): BlameEntry[] {
  return infos.map((info) => ({
    start_line: 1, // EntityBlameInfo doesn't have start_line — caller must provide
    commit_hash: info.commit_hash,
    author: info.author,
    timestamp: info.timestamp,
    message: info.message,
  }));
}
