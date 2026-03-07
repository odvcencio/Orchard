'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { RepoHeader } from '@/components/layout/repo-header';
import { RepoTabs } from '@/components/layout/repo-tabs';
import { useIssues, usePullRequests } from '@/lib/api/hooks';

export default function PublicRepoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ owner: string; repo: string }>();
  const searchParams = useSearchParams();
  const currentRef = searchParams.get('ref') ?? undefined;
  const { data: openPRs } = usePullRequests(params.owner, params.repo, 'open');
  const { data: openIssues } = useIssues(params.owner, params.repo, 'open');

  return (
    <div>
      <RepoHeader owner={params.owner} repo={params.repo} currentRef={currentRef} />
      <RepoTabs
        owner={params.owner}
        repo={params.repo}
        prCount={openPRs?.length}
        issueCount={openIssues?.length}
        showSettings={false}
      />
      <div className="px-6 pt-5">{children}</div>
    </div>
  );
}
