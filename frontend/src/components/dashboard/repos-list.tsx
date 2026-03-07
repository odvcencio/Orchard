'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, Lock, Star, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SkeletonCard } from '@/components/shared/loading-skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { useUserRepos } from '@/lib/api/hooks';
import type { Repository } from '@/lib/api/types';

function RepoCard({ repo }: { repo: Repository }) {
  return (
    <Link
      href={`/${repo.owner_name}/${repo.name}`}
      className="group flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-border hover:bg-muted/20"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <BookOpen className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
            {repo.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {repo.is_private && (
            <Badge variant="outline" className="text-xs h-5 gap-1 px-1.5">
              <Lock className="h-2.5 w-2.5" />
              Private
            </Badge>
          )}
          {typeof repo.star_count === 'number' && repo.star_count > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />
              {repo.star_count}
            </span>
          )}
        </div>
      </div>
      {repo.description ? (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {repo.description}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground/50 italic">No description</p>
      )}
    </Link>
  );
}

function ReposListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function ReposList() {
  const router = useRouter();
  const { data: repos, isLoading } = useUserRepos();

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Your Repositories</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push('/new')}
            className="gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ReposListSkeleton />
        ) : !repos || repos.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No repositories yet"
            description="Create your first repository to get started."
            action={{
              label: 'Create your first repository',
              onClick: () => router.push('/new'),
            }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {repos.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
