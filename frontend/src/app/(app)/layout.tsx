'use client';
import { useAuth } from '@/lib/auth/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/layout/app-shell';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) return null;

  return <AppShell>{children}</AppShell>;
}
