'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'Rawura.searchHistory';
const MAX_ITEMS_DEFAULT = 5;

function readHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as string[];
    return Array.isArray(arr) ? arr.slice(0, MAX_ITEMS_DEFAULT) : [];
  } catch {
    return [];
  }
}

function writeHistory(items: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS_DEFAULT)));
  } catch {
    // ignore quota or serialization errors
  }
}

export interface UseSearchHistory {
  history: string[];
  add: (term: string) => void;
  remove: (term: string) => void;
  clear: () => void;
}

export function useSearchHistory(maxItems = MAX_ITEMS_DEFAULT): UseSearchHistory {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const persist = useCallback(
    (items: string[]) => {
      const trimmed = items
        .filter(Boolean)
        .reduce<string[]>((acc, item) => {
          if (!acc.includes(item)) acc.push(item);
          return acc;
        }, [])
        .slice(0, maxItems);
      setHistory(trimmed);
      writeHistory(trimmed);
    },
    [maxItems]
  );

  const add = useCallback(
    (term: string) => {
      const cleaned = term.trim();
      if (!cleaned) return;
      const next = [cleaned, ...history.filter((h) => h.toLowerCase() !== cleaned.toLowerCase())];
      persist(next);
    },
    [history, persist]
  );

  const remove = useCallback(
    (term: string) => {
      const next = history.filter((h) => h.toLowerCase() !== term.trim().toLowerCase());
      persist(next);
    },
    [history, persist]
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  return useMemo(() => ({ history, add, remove, clear }), [history, add, remove, clear]);
}
