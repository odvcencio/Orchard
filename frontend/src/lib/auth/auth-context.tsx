'use client';

import { createContext, useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setToken, getToken, subscribeAuthTokenChange } from '@/lib/api/client';
import { useCurrentUser, queryKeys } from '@/lib/api/hooks';
import type { APIUser } from '@/lib/api/types';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  user: APIUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [hasToken, setHasToken] = useState<boolean>(() => !!getToken());

  const { data: user, isLoading, isFetching } = useCurrentUser();

  const login = useCallback(
    (token: string) => {
      setToken(token);
      setHasToken(true);
      qc.invalidateQueries({ queryKey: queryKeys.user });
    },
    [qc],
  );

  const logout = useCallback(() => {
    setToken(null);
    setHasToken(false);
    qc.removeQueries({ queryKey: queryKeys.user });
    router.replace('/login');
  }, [qc, router]);

  // Multi-tab sync: listen for token changes from other tabs
  useEffect(() => {
    const unsubscribe = subscribeAuthTokenChange(() => {
      const token = getToken();
      setHasToken(!!token);
      if (token) {
        qc.invalidateQueries({ queryKey: queryKeys.user });
      } else {
        qc.removeQueries({ queryKey: queryKeys.user });
      }
    });
    return unsubscribe;
  }, [qc]);

  const isAuthenticated = hasToken && !!user;
  const loading = hasToken ? isLoading || isFetching : false;

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isAuthenticated,
        isLoading: loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
