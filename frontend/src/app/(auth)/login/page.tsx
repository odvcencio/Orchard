'use client';

import { useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthCapabilities } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/use-auth';
import { PasskeyLogin } from '@/components/auth/passkey-login';
import { MagicLinkLogin } from '@/components/auth/magic-link-login';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

function LoginContent() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { data: caps, isLoading } = useAuthCapabilities();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  function handleSuccess() {
    router.push('/dashboard');
  }

  const passkeyEnabled = caps?.passkey_enabled ?? false;
  const magicLinkEnabled = caps?.magic_link_enabled ?? false;
  const neitherEnabled = !isLoading && !passkeyEnabled && !magicLinkEnabled;

  return (
    <Card className="bg-card border border-border/50">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back. Choose how you want to sign in.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <p className="text-sm text-muted-foreground text-center">Loading...</p>
        )}

        {neitherEnabled && (
          <p className="text-sm text-muted-foreground text-center">
            No authentication methods available.
          </p>
        )}

        {passkeyEnabled && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Passkey</p>
            <PasskeyLogin onSuccess={handleSuccess} />
          </div>
        )}

        {passkeyEnabled && magicLinkEnabled && (
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or</span>
            <Separator className="flex-1" />
          </div>
        )}

        {magicLinkEnabled && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Magic link</p>
            <MagicLinkLogin onSuccess={handleSuccess} />
          </div>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          {"Don't have an account? "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground text-center">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
