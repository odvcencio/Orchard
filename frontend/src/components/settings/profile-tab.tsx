'use client';

import { User, Mail, Calendar, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { RelativeTime } from '@/components/shared/relative-time';
import { useCurrentUser } from '@/lib/api/hooks';

function ProfileSkeleton() {
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

export function ProfileTab() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Profile</CardTitle>
          {user.is_admin && (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              Admin
            </Badge>
          )}
        </div>
        <CardDescription>Your account information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Username</p>
            <p className="text-sm font-medium">{user.username}</p>
          </div>
        </div>
        <Separator />
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
        </div>
        <Separator />
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Account created</p>
            <RelativeTime date={user.created_at} className="text-sm font-medium text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
