import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User } from '../types';
import { api } from '../lib/api';
import { setAuthToken, ApiError } from '../lib/http';
import { getStoredToken, setStoredToken, clearStoredToken } from '../lib/storage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithFace: (descriptor: number[]) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  // Bootstrap: restore a persisted session, then validate it with /me.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredToken();
      if (!stored) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }
      setAuthToken(stored);
      try {
        const { user: me } = await api.me();
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        setAuthToken(null);
        await clearStoredToken();
        setStatus('unauthenticated');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { token, user: u } = await api.login(email, password);
    setAuthToken(token);
    await setStoredToken(token);
    setUser(u);
    setStatus('authenticated');
  }, []);

  const signInWithFace = useCallback(async (descriptor: number[]) => {
    const { token, user: u } = await api.faceLogin(descriptor);
    setAuthToken(token);
    await setStoredToken(token);
    setUser(u);
    setStatus('authenticated');
  }, []);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    await clearStoredToken();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { user: me } = await api.me();
      setUser(me);
      setStatus('authenticated');
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setAuthToken(null);
        await clearStoredToken();
        setUser(null);
        setStatus('unauthenticated');
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, signIn, signInWithFace, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
