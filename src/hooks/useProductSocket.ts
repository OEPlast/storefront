'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import type {
  BatchedProductUpdate,
  ClientToServerEvents,
  ServerToClientEvents,
  SocketStatus,
} from '@/types/websocket';

interface UseProductSocketOptions {
  /**
   * Product IDs to subscribe to
   */
  productIds?: string[];

  /**
   * Whether to enable auto-reconnection
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Debounce time in milliseconds before triggering query invalidation
   * @default 1000
   */
  debounceMs?: number;

  /**
   * Whether to enable this socket connection
   * @default true
   */
  enabled?: boolean;

  /**
   * Callback when product updates are received
   */
  onUpdate?: (update: BatchedProductUpdate) => void;

  /**
   * Callback when connection status changes
   */
  onStatusChange?: (status: SocketStatus) => void;
}

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3003';

/**
 * Hook for managing WebSocket connection and product updates
 * Integrates with TanStack Query for silent data refetches
 */
export function useProductSocket(options: UseProductSocketOptions = {}) {
  const {
    productIds = [],
    autoReconnect = true,
    debounceMs = 1000,
    enabled = true,
    onUpdate,
    onStatusChange,
  } = options;

  const queryClient = useQueryClient();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [status, setStatus] = useState<SocketStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const debounceTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const subscribedProductsRef = useRef<Set<string>>(new Set());

  // Update status and notify callback
  const updateStatus = useCallback(
    (newStatus: SocketStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  // Debounced query invalidation
  const scheduleQueryInvalidation = useCallback(
    (productId: string) => {
      // Clear existing timer for this product
      const existingTimer = debounceTimersRef.current.get(productId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Schedule new invalidation
      const timer = setTimeout(() => {
        // Invalidate product-related queries
        queryClient.invalidateQueries({ queryKey: ['product', productId] });
        queryClient.invalidateQueries({ queryKey: ['products'] });

        // Clear timer reference
        debounceTimersRef.current.delete(productId);
      }, debounceMs);

      debounceTimersRef.current.set(productId, timer);
    },
    [queryClient, debounceMs]
  );

  // Subscribe to product updates
  const subscribeToProduct = useCallback(
    (productId: string) => {
      if (!socketRef.current || !isConnected) return;

      if (!subscribedProductsRef.current.has(productId)) {
        socketRef.current.emit('join_product', productId);
        subscribedProductsRef.current.add(productId);
        console.log(`[WebSocket] Subscribed to product: ${productId}`);
      }
    },
    [isConnected]
  );

  // Unsubscribe from product updates
  const unsubscribeFromProduct = useCallback(
    (productId: string) => {
      if (!socketRef.current || !isConnected) return;

      if (subscribedProductsRef.current.has(productId)) {
        socketRef.current.emit('leave_product', productId);
        subscribedProductsRef.current.delete(productId);
        console.log(`[WebSocket] Unsubscribed from product: ${productId}`);
      }
    },
    [isConnected]
  );

  // Request sync for a product (reconnection recovery)
  const requestSync = useCallback(
    (productId: string, lastTimestamp?: string) => {
      if (!socketRef.current || !isConnected) return;

      socketRef.current.emit('request_sync', productId, lastTimestamp);
      console.log(`[WebSocket] Requested sync for product: ${productId}`);
    },
    [isConnected]
  );

  // Initialize socket connection
  useEffect(() => {
    if (!enabled) return;

    updateStatus('connecting');

    // Create socket instance (anonymous connection - no auth token)
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(WEBSOCKET_URL, {
      reconnection: autoReconnect,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Capture refs for cleanup
    const debounceTimers = debounceTimersRef.current;
    const subscribedProducts = subscribedProductsRef.current;

    // Connection events
    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      updateStatus('connected');

      // Resubscribe to products after reconnection
      subscribedProducts.forEach((productId) => {
        socket.emit('join_product', productId);
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      setIsConnected(false);
      updateStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      updateStatus('error');
    });

    // Handle product updates
    socket.on('batched_product_update', (update: BatchedProductUpdate) => {
      console.log(`[WebSocket] Received batched update for product: ${update.productId}`, update);

      // Trigger callback
      onUpdate?.(update);

      // Schedule query invalidation (debounced)
      scheduleQueryInvalidation(update.productId);
    });

    // Handle pong response
    socket.on('pong', () => {
      console.log('[WebSocket] Pong received');
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
      updateStatus('error');
    });

    // Handle connection acknowledgment
    socket.on('connected', (data) => {
      console.log('[WebSocket] Connection acknowledged:', data);
    });

    // Cleanup on unmount
    return () => {
      console.log('[WebSocket] Cleaning up connection');

      // Clear all debounce timers
      debounceTimers.forEach((timer) => clearTimeout(timer));
      debounceTimers.clear();

      // Unsubscribe from all products
      subscribedProducts.forEach((productId) => {
        socket.emit('leave_product', productId);
      });
      subscribedProducts.clear();

      // Disconnect socket
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, autoReconnect, scheduleQueryInvalidation, onUpdate, updateStatus]);

  // Subscribe/unsubscribe to products based on productIds prop
  useEffect(() => {
    if (!enabled || !isConnected) return;

    // Subscribe to new products
    productIds.forEach((productId) => {
      subscribeToProduct(productId);
    });

    // Unsubscribe from removed products
    const currentProducts = new Set(productIds);
    subscribedProductsRef.current.forEach((productId) => {
      if (!currentProducts.has(productId)) {
        unsubscribeFromProduct(productId);
      }
    });
  }, [productIds, enabled, isConnected, subscribeToProduct, unsubscribeFromProduct]);

  return {
    status,
    isConnected,
    subscribeToProduct,
    unsubscribeFromProduct,
    requestSync,
    socket: socketRef.current,
  };
}
