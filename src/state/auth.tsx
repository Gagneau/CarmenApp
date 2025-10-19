import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { setToken, clearToken, getToken, readItem, writeItem, deleteItem } from '../api/client';

type Role = 'admin' | 'adult' | 'child';
type User = { user_id: string; role: Role; display_name: string };

type AuthCtx = {
  user: User | null;
  ready: boolean; // true after restore attempt
  signIn: (u: User & { token: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const raw = await readItem('user'); // web-safe read
        if (token && raw) setUser(JSON.parse(raw) as User);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const signIn = async (u: User & { token: string }) => {
    await setToken(u.token); // web/device safe
    await writeItem(
      'user',
      JSON.stringify({ user_id: u.user_id, role: u.role, display_name: u.display_name })
    ); // web/device safe
    setUser({ user_id: u.user_id, role: u.role, display_name: u.display_name });
  };

  const signOut = async () => {
    await clearToken();       // remove token everywhere
    await deleteItem('user'); // fully remove user (don’t write empty string)
    setUser(null);
  };

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
