'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRequestMagicLink, useVerifyMagicLink } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/use-auth';
import type { AuthResponse } from '@/lib/api/types';

interface MagicLinkLoginProps {
  onSuccess?: () => void;
}

export function MagicLinkLogin({ onSuccess }: MagicLinkLoginProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();
  const searchParams = useSearchParams();

  const requestLink = useRequestMagicLink();
  const verifyLink = useVerifyMagicLink();

  // Auto-verify if token is present in the URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;

    verifyLink.mutate(token, {
      onSuccess: (result) => {
        const { token: authToken } = result as AuthResponse;
        auth.login(authToken);
        onSuccess?.();
      },
      onError: (err: unknown) => {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Invalid or expired magic link.');
        }
      },
    });
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    try {
      await requestLink.mutateAsync(email.trim());
      setSent(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to send magic link. Please try again.');
      }
    }
  }

  if (verifyLink.isPending) {
    return <p className="text-sm text-muted-foreground text-center">Verifying your link...</p>;
  }

  if (sent) {
    return (
      <p className="text-emerald-400 text-sm text-center">
        Check your email for a login link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="magic-email">Email address</Label>
        <Input
          id="magic-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={requestLink.isPending}
          autoComplete="email"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={requestLink.isPending}>
        {requestLink.isPending ? 'Sending...' : 'Send Magic Link'}
      </Button>
    </form>
  );
}
