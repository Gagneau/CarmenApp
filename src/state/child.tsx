// src/state/child.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CHILDREN } from '../config';

type Ctx = {
  childId: string;
  childName: string;
  children: Array<{ id: string; name: string }>;
  setChildId: (id: string) => void;
};

const SelectedChildCtx = createContext<Ctx | undefined>(undefined);

export function SelectedChildProvider({ children: node }: { children: React.ReactNode }) {
  const [children] = useState(CHILDREN);
  const [childId, setChildId] = useState<string>(CHILDREN[0]?.id || '');
  const childName = useMemo(
    () => children.find((c) => c.id === childId)?.name || '',
    [children, childId]
  );

  const value = useMemo(
    () => ({ childId, childName, children, setChildId }),
    [childId, childName, children]
  );
  return <SelectedChildCtx.Provider value={value}>{node}</SelectedChildCtx.Provider>;
}

export function useSelectedChild() {
  const ctx = useContext(SelectedChildCtx);
  if (!ctx) throw new Error('useSelectedChild must be used inside <SelectedChildProvider>');
  return ctx;
}
