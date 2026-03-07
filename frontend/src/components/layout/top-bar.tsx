'use client';

import { Menu, Bell, Search, User, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebarStore } from '@/lib/stores/sidebar-store';
import { useCommandPaletteStore } from '@/lib/stores/command-palette-store';
import { useAuth } from '@/lib/auth/use-auth';
import { useUnreadNotificationsCount } from '@/lib/api/hooks';
import Link from 'next/link';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function TopBar() {
  const { setMobileOpen } = useSidebarStore();
  const { toggle: toggleCommandPalette } = useCommandPaletteStore();
  const { user, logout } = useAuth();
  const { data: unreadCount } = useUnreadNotificationsCount();

  const userInitial = user?.username?.[0]?.toUpperCase() ?? 'U';
  const count = typeof unreadCount === 'number' ? unreadCount : 0;

  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-background px-4">
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden text-muted-foreground hover:text-foreground"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Mobile logo (hidden on desktop — sidebar shows it) */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <span className="text-xs font-bold text-primary-foreground">O</span>
        </div>
        <span className="text-sm font-semibold tracking-tight">Orchard</span>
      </div>

      {/* Search trigger */}
      <Button
        variant="outline"
        className="hidden sm:flex flex-1 max-w-sm justify-start gap-2 text-muted-foreground bg-background hover:bg-accent"
        aria-label="Open command palette"
        onClick={toggleCommandPalette}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="text-sm">Search...</span>
        <kbd className="ml-auto hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘K</span>
        </kbd>
      </Button>

      {/* Right side actions */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground"
          aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}
          asChild
        >
          <Link href="/notifications">
            <Bell className="h-5 w-5" />
            {count > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center p-0 text-[10px] leading-none"
              >
                {count > 9 ? '9+' : count}
              </Badge>
            )}
          </Link>
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full text-muted-foreground hover:text-foreground"
              aria-label="User menu"
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {user && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.username}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/${user?.username}`} className="flex items-center gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
