'use client';

import Link from 'next/link';
import { Building2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrgHeaderProps {
  org: string;
  displayName: string;
}

export function OrgHeader({ org, displayName }: OrgHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4 min-w-0">
        <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <Building2 className="h-7 w-7 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{displayName}</h1>
          <p className="text-sm text-muted-foreground truncate">{org}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" asChild className="shrink-0 gap-2">
        <Link href={`/orgs/${org}/settings`}>
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </Button>
    </div>
  );
}
