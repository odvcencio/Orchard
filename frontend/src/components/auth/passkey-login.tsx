'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBeginWebAuthnLogin, useFinishWebAuthnLogin } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/use-auth';
import { getPasskeyAssertion, browserSupportsPasskeys } from '@/lib/auth/webauthn';
import type { AuthResponse } from '@/lib/api/types';

interface PasskeyLoginProps {
  onSuccess?: () => void;
}

export function PasskeyLogin({ onSuccess }: PasskeyLoginProps) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();

  const beginLogin = useBeginWebAuthnLogin();
  const finishLogin = useFinishWebAuthnLogin();

  const isPending = beginLogin.isPending || finishLogin.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!browserSupportsPasskeys()) {
      setError('Your browser does not support passkeys.');
      return;
    }

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }

    try {
      const beginResult = await beginLogin.mutateAsync(username.trim());
      const { session_id: sessionId, options } = beginResult as { session_id: string; options: unknown };

      const credential = await getPasskeyAssertion(options);

      const result = await finishLogin.mutateAsync({ sessionId, credential });
      const { token } = result as AuthResponse;

      auth.login(token);
      onSuccess?.();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Passkey sign-in failed. Please try again.');
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="passkey-username">Username</Label>
        <Input
          id="passkey-username"
          type="text"
          placeholder="your-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isPending}
          autoComplete="username webauthn"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Signing in...' : 'Sign in with Passkey'}
      </Button>
    </form>
  );
}
