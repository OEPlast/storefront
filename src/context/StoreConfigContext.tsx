'use client';

import React, { createContext, useContext } from 'react';
import type { StoreBranding } from '@/libs/storeBranding';

type StoreConfigValue = StoreBranding;

const StoreConfigContext = createContext<StoreConfigValue | null>(null);

/**
 * Hands the server-fetched branding (see `libs/storeBranding.ts`) down to Client Components,
 * which can't call the async branding fetch themselves. Fed once from the root layout — not a
 * fetch boundary itself.
 */
export function StoreConfigProvider({
  storeName,
  whatsappNumber,
  children,
}: StoreConfigValue & { children: React.ReactNode }) {
  return (
    <StoreConfigContext.Provider value={{ storeName, whatsappNumber }}>{children}</StoreConfigContext.Provider>
  );
}

export function useStoreConfig(): StoreConfigValue {
  const ctx = useContext(StoreConfigContext);
  if (!ctx) throw new Error('useStoreConfig must be used within a StoreConfigProvider');
  return ctx;
}
