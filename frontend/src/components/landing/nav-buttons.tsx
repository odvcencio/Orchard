'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/theme-toggle';

export function NavButtons() {
  return (
    <div className="flex items-center gap-3">
      <Link href="/explore" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Explore
      </Link>
      <ThemeToggle />
      <Button variant="ghost" size="sm" asChild>
        <Link href="/login">Log in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/signup">Sign up</Link>
      </Button>
    </div>
  );
}
