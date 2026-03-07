'use client';

import { KeyRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/shared/relative-time';
import { EmptyState } from '@/components/shared/empty-state';
import { usePasskeys } from '@/lib/api/hooks';
import type { PasskeyCredential } from '@/lib/api/types';

function PasskeyItem({ passkey }: { passkey: PasskeyCredential }) {
  const shortCredentialId =
    passkey.credential_id.length > 20
      ? passkey.credential_id.slice(0, 20) + '…'
      : passkey.credential_id;

  return (
    <div className="flex items-start gap-3 py-3">
      <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
      <div className="min-w-0">
        <p className="text-sm font-mono text-muted-foreground truncate">{shortCredentialId}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Registered <RelativeTime date={passkey.created_at} />
        </p>
        {passkey.last_used_at && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Last used <RelativeTime date={passkey.last_used_at} />
          </p>
        )}
      </div>
    </div>
  );
}

function PasskeysListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3">
          <Skeleton className="h-4 w-4 rounded mt-0.5" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PasskeysTab() {
  const { data: passkeys, isLoading } = usePasskeys();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Passkeys</CardTitle>
        <CardDescription>
          Passkeys provide a secure, passwordless way to sign in. Register them during login or sign-up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <PasskeysListSkeleton />
        ) : !passkeys || passkeys.length === 0 ? (
          <EmptyState
            icon={KeyRound}
            title="No passkeys registered"
            description="Passkeys can be registered during the login or sign-up flow."
          />
        ) : (
          <div className="divide-y divide-border">
            {passkeys.map((passkey, index) => (
              <PasskeyItem key={passkey.id ?? index} passkey={passkey} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
