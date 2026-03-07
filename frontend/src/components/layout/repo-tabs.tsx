'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code, GitPullRequest, CircleDot, History, Settings, Split } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RepoTabsProps {
  owner: string;
  repo: string;
  prCount?: number;
  issueCount?: number;
  showSettings?: boolean;
}

interface TabDef {
  label: string;
  href: string;
  icon: React.ReactNode;
  count?: number;
  matchPaths: string[];
}

export function RepoTabs({ owner, repo, prCount, issueCount, showSettings = true }: RepoTabsProps) {
  const pathname = usePathname();
  const base = `/${owner}/${repo}`;

  const tabs: TabDef[] = [
    {
      label: 'Code',
      href: base,
      icon: <Code className="h-3.5 w-3.5" />,
      matchPaths: [base, `${base}/tree`, `${base}/blob`, `${base}/code`],
    },
    {
      label: 'Pull Requests',
      href: `${base}/pulls`,
      icon: <GitPullRequest className="h-3.5 w-3.5" />,
      count: prCount,
      matchPaths: [`${base}/pulls`],
    },
    {
      label: 'Issues',
      href: `${base}/issues`,
      icon: <CircleDot className="h-3.5 w-3.5" />,
      count: issueCount,
      matchPaths: [`${base}/issues`],
    },
    {
      label: 'Commits',
      href: `${base}/commits`,
      icon: <History className="h-3.5 w-3.5" />,
      matchPaths: [`${base}/commits`],
    },
    {
      label: 'Compare',
      href: `${base}/compare`,
      icon: <Split className="h-3.5 w-3.5" />,
      matchPaths: [`${base}/compare`],
    },
    ...(showSettings
      ? [{
      label: 'Settings',
      href: `${base}/settings`,
      icon: <Settings className="h-3.5 w-3.5" />,
      matchPaths: [`${base}/settings`],
      }]
      : []),
  ];

  function isActive(tab: TabDef): boolean {
    // Exact match for root (Code tab)
    if (tab.href === base && (pathname === base || pathname === `${base}/`)) {
      return true;
    }
    // Prefix match for all other tabs (and tree/blob sub-paths for Code)
    return tab.matchPaths.some(
      (p) => p !== base && (pathname === p || pathname.startsWith(p + '/')),
    );
  }

  return (
    <div className="border-b border-border bg-background">
      <nav
        className="flex items-end gap-0 px-6 overflow-x-auto scrollbar-hide"
        aria-label="Repository navigation"
      >
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'group flex items-center gap-2 whitespace-nowrap px-4 py-3 text-sm font-medium',
                'border-b-2 transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                active
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <span
                className={cn(
                  'transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                )}
              >
                {tab.icon}
              </span>
              {tab.label}
              {tab.count !== undefined && (
                <Badge
                  variant="outline"
                  className={cn(
                    'h-4 min-w-[1.25rem] px-1 text-[10px] leading-none font-medium border-border',
                    active
                      ? 'bg-primary/15 text-primary border-primary/30'
                      : 'bg-muted/50 text-muted-foreground',
                  )}
                >
                  {tab.count}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
