'use client';

import { Globe, Lock, BookOpen, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RelativeTime } from '@/components/shared/relative-time';
import { useRepository } from '@/lib/api/hooks';

interface GeneralTabProps {
  owner: string;
  repo: string;
}

function GeneralSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-40" />
      </CardContent>
    </Card>
  );
}

export function GeneralTab({ owner, repo }: GeneralTabProps) {
  const { data: repoData, isLoading } = useRepository(owner, repo);

  if (isLoading) {
    return <GeneralSkeleton />;
  }

  if (!repoData) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
        <CardDescription>Repository information and visibility</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Repository name</p>
            <p className="text-sm font-medium font-mono">
              {owner}/{repoData.name}
            </p>
          </div>
        </div>

        <Separator />

        <div className="flex items-start gap-3">
          <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            {repoData.description ? (
              <p className="text-sm">{repoData.description}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">No description provided</p>
            )}
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          {repoData.is_private ? (
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <div>
            <p className="text-xs text-muted-foreground">Visibility</p>
            <div className="mt-0.5">
              {repoData.is_private ? (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  Private
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <Globe className="h-3 w-3" />
                  Public
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Created</p>
            <RelativeTime date={repoData.created_at} className="text-sm font-medium text-foreground" />
          </div>
        </div>

        <Separator />

        <div className="flex items-center gap-3">
          <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Default branch</p>
            <p className="text-sm font-medium font-mono">{repoData.default_branch || 'main'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
