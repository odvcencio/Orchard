'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { GitFork, Star, Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { OrgHeader } from '@/components/orgs/org-header';
import { useOrg, useOrgRepos } from '@/lib/api/hooks';

function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-6 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function OrgPage() {
  const params = useParams<{ org: string }>();
  const { org } = params;

  const { data: orgData, isLoading: orgLoading } = useOrg(org);
  const { data: repos, isLoading: reposLoading } = useOrgRepos(org);

  if (orgLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6">
      <OrgHeader
        org={org}
        displayName={orgData?.display_name || org}
      />

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Repositories</h2>

        {reposLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : !repos || repos.length === 0 ? (
          <EmptyState
            icon={GitFork}
            title="No repositories yet"
            description="This organization doesn't have any repositories yet."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repos.map((repo) => (
              <Link
                key={repo.id}
                href={`/${orgData?.name ?? org}/${repo.name}`}
                className="block"
              >
                <Card className="hover:border-border/80 transition-colors hover:bg-muted/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-foreground truncate">
                            {repo.name}
                          </span>
                          {repo.is_private && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="h-3 w-3" />
                              Private
                            </Badge>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                      </div>
                      {typeof repo.star_count === 'number' && repo.star_count > 0 && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Star className="h-3.5 w-3.5" />
                          {repo.star_count}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
