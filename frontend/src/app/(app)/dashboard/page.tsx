'use client';

import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { OpenPRsCard } from '@/components/dashboard/open-prs-card';
import { ReposList } from '@/components/dashboard/repos-list';
import { useCurrentUser } from '@/lib/api/hooks';
import { Skeleton } from '@/components/ui/skeleton';

function GreetingHeader({ username }: { username?: string }) {
  return (
    <div className="mb-6">
      {username ? (
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {username}
        </h1>
      ) : (
        <Skeleton className="h-8 w-64" />
      )}
      <p className="mt-1 text-sm text-muted-foreground">
        Here&apos;s what&apos;s happening across your repositories.
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { data: user } = useCurrentUser();

  return (
    <div className="p-6">
      <GreetingHeader username={user?.username} />

      {/* Mobile: single column, repos first, then activity, then PRs */}
      {/* Desktop: two columns — left 2/3 (activity + PRs), right 1/3 (repos) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right column on desktop (shown first on mobile) */}
        <div className="order-first lg:order-last lg:col-span-1">
          <ReposList />
        </div>

        {/* Left column on desktop */}
        <div className="lg:col-span-2 flex flex-col gap-6 order-last lg:order-first">
          <ActivityFeed />
          <OpenPRsCard />
        </div>
      </div>
    </div>
  );
}
