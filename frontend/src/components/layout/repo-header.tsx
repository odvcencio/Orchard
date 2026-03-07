'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Star, GitFork, GitBranch, ChevronDown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRepository, useRepoStars, useStarRepo, useUnstarRepo, useForkRepo, useBranches } from '@/lib/api/hooks';
import { cn } from '@/lib/utils';

interface RepoHeaderProps {
  owner: string;
  repo: string;
  currentRef?: string;
}

export function RepoHeader({ owner, repo, currentRef }: RepoHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: repoData } = useRepository(owner, repo);
  const { data: starsData } = useRepoStars(owner, repo);
  const { data: branches } = useBranches(owner, repo);
  const starMutation = useStarRepo();
  const unstarMutation = useUnstarRepo();
  const forkMutation = useForkRepo();

  const defaultBranch = repoData?.default_branch ?? 'main';
  const activeBranch = currentRef ?? searchParams.get('ref') ?? defaultBranch;
  const isStarred = starsData?.starred ?? false;
  const starCount = starsData?.count ?? 0;

  function branchHref(branch: string): string {
    const params = new URLSearchParams(searchParams.toString());
    params.set('ref', branch);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function handleStarToggle() {
    if (isStarred) {
      unstarMutation.mutate({ owner, repo });
    } else {
      starMutation.mutate({ owner, repo });
    }
  }

  function handleFork() {
    forkMutation.mutate({ owner, repo });
  }

  return (
    <div className="border-b border-border bg-background px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: owner / repo breadcrumb + branch selector */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            <Link
              href={`/${owner}`}
              className="font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {owner}
            </Link>
            <span className="text-muted-foreground select-none">/</span>
            <Link
              href={`/${owner}/${repo}`}
              className="font-semibold text-foreground hover:text-primary transition-colors"
            >
              {repo}
            </Link>
          </div>

          {/* Privacy badge */}
          {repoData?.is_private && (
            <Badge variant="outline" className="gap-1 text-xs text-muted-foreground border-border">
              <Lock className="h-3 w-3" />
              Private
            </Badge>
          )}

          {/* Branch selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs font-medium border-border bg-muted/30 hover:bg-accent"
              >
                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-[120px] truncate">{activeBranch}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
              {branches && branches.length > 0 ? (
                branches.map((branch) => (
                  <DropdownMenuItem key={branch} asChild>
                    <Link
                      href={branchHref(branch)}
                      className={cn(
                        'flex items-center gap-2 cursor-pointer',
                        branch === activeBranch && 'font-semibold text-primary',
                      )}
                    >
                      <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{branch}</span>
                    </Link>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No branches</div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: star + fork actions */}
        <div className="flex items-center gap-2">
          {/* Star button */}
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStarToggle}
              disabled={starMutation.isPending || unstarMutation.isPending}
              className={cn(
                'h-7 gap-1.5 rounded-none px-3 text-xs font-medium border-r border-border',
                'hover:bg-accent transition-colors',
                isStarred && 'text-[var(--color-warning)] hover:text-[var(--color-warning)]',
              )}
            >
              <Star
                className={cn(
                  'h-3.5 w-3.5',
                  isStarred && 'fill-current text-[var(--color-warning)]',
                )}
              />
              {isStarred ? 'Unstar' : 'Star'}
            </Button>
            <span className="px-2.5 text-xs font-medium text-muted-foreground bg-muted/20 h-7 flex items-center min-w-[2rem] justify-center">
              {starCount}
            </span>
          </div>

          {/* Fork button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFork}
            disabled={forkMutation.isPending}
            className="h-7 gap-1.5 text-xs font-medium border-border hover:bg-accent"
          >
            <GitFork className="h-3.5 w-3.5" />
            Fork
          </Button>
        </div>
      </div>
    </div>
  );
}
