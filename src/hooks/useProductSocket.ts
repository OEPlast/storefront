'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { subscribeProduct } from '@/libs/productSocketSingleton';
import type { BatchedProductUpdate } from '@/types/websocket';

interface UseProductSocketOptions {
  productIds?: string[];
  debounceMs?: number;
  enabled?: boolean;
  onUpdate?: (update: BatchedProductUpdate) => void;
}

export function useProductSocket(options: UseProductSocketOptions = {}) {
  const { productIds = [], debounceMs = 1000, enabled = true, onUpdate } = options;

  const queryClient = useQueryClient();
  const debounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const scheduleQueryInvalidation = useCallback(
    (productId: string) => {
      const existing = debounceTimersRef.current.get(productId);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['product', productId] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        debounceTimersRef.current.delete(productId);
      }, debounceMs);

      debounceTimersRef.current.set(productId, timer);
    },
    [queryClient, debounceMs]
  );

  useEffect(() => {
    if (!enabled) return;

    const ids = productIds.filter(Boolean);
    if (ids.length === 0) return;

    const unsubscribers = ids.map((productId) =>
      subscribeProduct(productId, (update) => {
        onUpdateRef.current?.(update);
        scheduleQueryInvalidation(update.productId);
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      debounceTimersRef.current.forEach((t) => clearTimeout(t));
      debounceTimersRef.current.clear();
    };
  // productIds identity changes each render for inline arrays; use join as stable dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, productIds.join(','), scheduleQueryInvalidation]);
}
