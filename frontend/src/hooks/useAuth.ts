'use client';

import { useState, useEffect, useRef } from 'react';
import { authManager } from '@/lib/auth';
import { Session } from '@/lib/types';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    if (!initialLoadDone.current) {
      // Load initial session
      setSession(authManager.getSession());
      setLoading(false);
      initialLoadDone.current = true;
    }

    // Subscribe to session changes
    const unsubscribe = authManager.subscribe((newSession) => {
      setSession(newSession);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const result = await authManager.login(email, password);
    if (result.success) {
      setSession(authManager.getSession());
    }
    return result;
  };

  const register = async (data: { name: string; email: string; password: string; phone?: string; cpf?: string }) => {
    const result = await authManager.register(data);
    if (result.success) {
      setSession(authManager.getSession());
    }
    return result;
  };

  const logout = () => {
    authManager.logout();
    setSession(null);
  };

  const refresh = async () => {
    await authManager.refreshSession();
    setSession(authManager.getSession());
  };

  return {
    user: session?.user ?? null,
    token: session?.token ?? null,
    isAuthenticated: authManager.isAuthenticated(),
    loading,
    login,
    register,
    logout,
    refresh,
  };
}
