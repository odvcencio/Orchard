'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  GitBranch,
  GitPullRequest,
  CircleDot,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useUserRepos } from '@/lib/api/hooks';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  active: boolean;
}

function NavItem({ href, icon, label, collapsed, active }: NavItemProps) {
  const item = (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground',
        collapsed && 'justify-center px-2',
      )}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{item}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return item;
}

interface SidebarContentProps {
  collapsed: boolean;
  onCollapse?: () => void;
  showCollapseToggle?: boolean;
}

function SidebarContent({ collapsed, onCollapse, showCollapseToggle = true }: SidebarContentProps) {
  const pathname = usePathname();
  const { data: repos } = useUserRepos();

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-border px-4',
          collapsed ? 'justify-center px-2' : 'gap-2',
        )}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary">
          <span className="text-xs font-bold text-primary-foreground">O</span>
        </div>
        {!collapsed && (
          <span className="text-base font-semibold tracking-tight">Orchard</span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-3">
        <TooltipProvider delayDuration={0}>
          <nav className="flex flex-col gap-1">
            <NavItem
              href="/dashboard"
              icon={<Home className="h-4 w-4" />}
              label="Dashboard"
              collapsed={collapsed}
              active={pathname === '/dashboard'}
            />

            <Separator className="my-2" />

            {!collapsed && (
              <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Repositories
              </p>
            )}

            {repos && repos.length > 0 ? (
              repos.slice(0, 8).map((repo) => (
                <NavItem
                  key={repo.id}
                  href={`/${repo.owner_name}/${repo.name}`}
                  icon={<GitBranch className="h-4 w-4" />}
                  label={`${repo.owner_name}/${repo.name}`}
                  collapsed={collapsed}
                  active={pathname === `/${repo.owner_name}/${repo.name}` ||
                    pathname.startsWith(`/${repo.owner_name}/${repo.name}/`)}
                />
              ))
            ) : (
              !collapsed && (
                <p className="px-3 py-1 text-xs text-muted-foreground">No repositories yet</p>
              )
            )}

            <Separator className="my-2" />

            <NavItem
              href="/pulls"
              icon={<GitPullRequest className="h-4 w-4" />}
              label="Pull Requests"
              collapsed={collapsed}
              active={pathname === '/pulls' || pathname.startsWith('/pulls/')}
            />
            <NavItem
              href="/issues"
              icon={<CircleDot className="h-4 w-4" />}
              label="Issues"
              collapsed={collapsed}
              active={pathname === '/issues' || pathname.startsWith('/issues/')}
            />

            <Separator className="my-2" />

            <NavItem
              href="/settings"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              collapsed={collapsed}
              active={pathname === '/settings' || pathname.startsWith('/settings/')}
            />
          </nav>
        </TooltipProvider>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border px-2 py-3">
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-col gap-1">
            {collapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/new"
                    className={cn(
                      'flex items-center justify-center rounded-md px-2 py-2 text-sm font-medium transition-colors',
                      'hover:bg-accent hover:text-accent-foreground text-muted-foreground',
                    )}
                  >
                    <Plus className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">New Repository</TooltipContent>
              </Tooltip>
            ) : (
              <Link
                href="/new"
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground text-muted-foreground',
                )}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>New Repository</span>
              </Link>
            )}

            {showCollapseToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onCollapse}
                className={cn(
                  'w-full text-muted-foreground hover:text-foreground',
                  collapsed ? 'justify-center px-2' : 'justify-start gap-3 px-3',
                )}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 shrink-0" />
                    <span>Collapse</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { collapsed, mobileOpen, toggle, setMobileOpen } = useSidebarStore();

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col border-r border-border bg-background transition-all duration-200',
          collapsed ? 'w-14' : 'w-60',
        )}
      >
        <SidebarContent collapsed={collapsed} onCollapse={toggle} showCollapseToggle />
      </aside>

      {/* Mobile sidebar via Sheet */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0 bg-background">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SidebarContent
            collapsed={false}
            showCollapseToggle={false}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
