'use client';

import { useParams } from 'next/navigation';
import { RepoHeader } from '@/components/layout/repo-header';
import { RepoTabs } from '@/components/layout/repo-tabs';

export default function RepoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ owner: string; repo: string }>();

  return (
    <div>
      <RepoHeader owner={params.owner} repo={params.repo} />
      <RepoTabs owner={params.owner} repo={params.repo} />
      <div className="mt-4">{children}</div>
    </div>
  );
}
