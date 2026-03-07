'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRegister } from '@/lib/api/hooks';
import { useAuth } from '@/lib/auth/use-auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AuthResponse } from '@/lib/api/types';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useAuth();
  const register = useRegister();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }

    try {
      const result = await register.mutateAsync({ username: username.trim(), email: email.trim() });
      // If the server returns a token, log in immediately
      const authResult = result as AuthResponse | undefined;
      if (authResult?.token) {
        login(authResult.token);
        router.push('/dashboard');
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  }

  return (
    <Card className="bg-card border border-border/50">
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Sign up to get started with Orchard.</CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <p className="text-emerald-400 text-sm text-center">
            Account created! Check your email to continue.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="signup-username">Username</Label>
              <Input
                id="signup-username"
                type="text"
                placeholder="your-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={register.isPending}
                autoComplete="username"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email address</Label>
              <Input
                id="signup-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={register.isPending}
                autoComplete="email"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={register.isPending}>
              {register.isPending ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
