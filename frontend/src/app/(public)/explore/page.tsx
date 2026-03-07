'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Star, Lock } from 'lucide-react';
import { useExploreRepos } from '@/lib/api/hooks';
import { RelativeTime } from '@/components/shared/relative-time';
import { EmptyState } from '@/components/shared/empty-state';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

type SortOption = 'created' | 'stars' | 'name';

const SORT_LABELS: Record<SortOption, string> = {
  created: 'Recently created',
  stars: 'Most stars',
  name: 'Name',
};

function RepoCardSkeleton() {
  return (
    <Card className="gap-3 py-5">
      <CardHeader className="pb-0">
        <Skeleton className="h-5 w-3/5" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex items-center gap-3 pt-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('created');

  const { data: repos, isLoading } = useExploreRepos(sort === 'created' ? 'created' : undefined);

  const filtered = useMemo(() => {
    if (!repos) return [];

    let result = [...repos];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.owner_name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q)),
      );
    }

    if (sort === 'stars') {
      result.sort((a, b) => (b.star_count ?? 0) - (a.star_count ?? 0));
    } else if (sort === 'name') {
      result.sort((a, b) => `${a.owner_name}/${a.name}`.localeCompare(`${b.owner_name}/${b.name}`));
    }
    // 'created' sort is handled server-side via the sort param

    return result;
  }, [repos, search, sort]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          Explore Repositories
        </h1>
        <p className="mt-2 text-muted-foreground">
          Discover public repositories on this server.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-md border border-border p-1 bg-card shrink-0">
          {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
            <button
              key={option}
              onClick={() => setSort(option)}
              className={[
                'px-3 py-1 text-sm rounded-sm transition-colors',
                sort === option
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              {SORT_LABELS[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton grid */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <RepoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <EmptyState
          icon={Search}
          title="No repositories found"
          description={
            search
              ? `No repositories match "${search}". Try a different search term.`
              : 'There are no public repositories to explore yet.'
          }
        />
      )}

      {/* Repo grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((repo) => (
            <Link
              key={repo.id}
              href={`/${repo.owner_name}/${repo.name}`}
              className="group block"
            >
              <Card className="h-full gap-3 py-5 transition-colors hover:border-ring/60">
                <CardHeader className="pb-0">
                  <CardTitle className="text-base leading-snug">
                    <span className="text-muted-foreground">{repo.owner_name}/</span>
                    <span className="text-foreground group-hover:text-primary transition-colors">
                      {repo.name}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  {repo.description ? (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {repo.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic">No description</p>
                  )}
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-auto">
                    {repo.star_count !== undefined && repo.star_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        {repo.star_count}
                      </span>
                    )}
                    {repo.is_private && (
                      <Badge variant="outline" className="text-xs gap-1 py-0">
                        <Lock className="h-2.5 w-2.5" />
                        Private
                      </Badge>
                    )}
                    <span className="ml-auto">
                      <RelativeTime date={repo.created_at} />
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
