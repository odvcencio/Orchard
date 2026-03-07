'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthCalloutProps {
  title: string;
  description: string;
  returnTo: string;
  actionLabel?: string;
}

export function AuthCallout({
  title,
  description,
  returnTo,
  actionLabel = 'Sign in',
}: AuthCalloutProps) {
  const href = `/login?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href={href}>
            <LogIn className="h-4 w-4" />
            {actionLabel}
          </Link>
        </Button>
      </div>
    </div>
  );
}
