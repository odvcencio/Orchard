'use client';

import { Star, GitFork, GitBranch, File } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useTree, useRepoStars, useRepoForks, useBranches } from '@/lib/api/hooks';

interface RepoStatsProps {
  owner: string;
  repo: string;
  gitRef: string;
}

function StatItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number | undefined;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      {value === undefined ? (
        <Skeleton className="h-4 w-8" />
      ) : (
        <span className="text-sm text-foreground font-medium">{value}</span>
      )}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

export function RepoStats({ owner, repo, gitRef }: RepoStatsProps) {
  const { data: tree, isLoading: treeLoading } = useTree(owner, repo, gitRef);
  const { data: starsData, isLoading: starsLoading } = useRepoStars(owner, repo);
  const { data: forks, isLoading: forksLoading } = useRepoForks(owner, repo);
  const { data: branches, isLoading: branchesLoading } = useBranches(owner, repo);

  const isLoading = treeLoading || starsLoading || forksLoading || branchesLoading;

  const fileCount = tree ? tree.filter((entry) => !entry.is_dir).length : undefined;
  const starCount = starsData?.count;
  const forkCount = forks?.length;
  const branchCount = Array.isArray(branches) ? branches.length : undefined;

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Repository Stats</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <StatsSkeleton />
        ) : (
          <div className="divide-y divide-border/50">
            <StatItem icon={Star} label="Stars" value={starCount} />
            <StatItem icon={GitFork} label="Forks" value={forkCount} />
            <StatItem icon={GitBranch} label="Branches" value={branchCount} />
            <StatItem icon={File} label="Files" value={fileCount} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
