import React, { createContext, useContext, useMemo, useState } from 'react';

/**
 * Very light data-invalidator: whenever you complete a write (submit, preference change, payout),
 * call invalidate(). Any screen that cares can watch `version` and refetch.
 */
type DataCtx = {
  version: number;           // increments on any data change
  invalidate: () => void;    // call this after successful writes
};
const Ctx = createContext<DataCtx | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [version, setVersion] = useState(0);
  const invalidate = () => setVersion((v) => v + 1);
  const value = useMemo(() => ({ version, invalidate }), [version]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
