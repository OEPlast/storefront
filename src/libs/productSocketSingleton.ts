'use client';

import { io, Socket } from 'socket.io-client';
import type {
  BatchedProductUpdate,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@/types/websocket';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3003';

type UpdateCallback = (update: BatchedProductUpdate) => void;

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let consumerCount = 0;
let isConnected = false;
const roomRefCounts = new Map<string, number>();
const callbackRegistry = new Map<string, Set<UpdateCallback>>();

function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket) return socket;

  socket = io(WEBSOCKET_URL, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => {
    isConnected = true;
    roomRefCounts.forEach((_, productId) => socket!.emit('join_product', productId));
  });

  socket.on('disconnect', () => {
    isConnected = false;
  });

  socket.on('batched_product_update', (update: BatchedProductUpdate) => {
    callbackRegistry.get(update.productId)?.forEach((cb) => cb(update));
  });

  return socket;
}

export function subscribeProduct(productId: string, cb: UpdateCallback): () => void {
  consumerCount++;
  const sock = getSocket();

  if (!callbackRegistry.has(productId)) callbackRegistry.set(productId, new Set());
  callbackRegistry.get(productId)!.add(cb);

  const roomCount = (roomRefCounts.get(productId) ?? 0) + 1;
  roomRefCounts.set(productId, roomCount);
  if (roomCount === 1 && isConnected) sock.emit('join_product', productId);

  return () => {
    const cbs = callbackRegistry.get(productId);
    if (cbs) {
      cbs.delete(cb);
      if (cbs.size === 0) callbackRegistry.delete(productId);
    }

    const newRoomCount = (roomRefCounts.get(productId) ?? 1) - 1;
    if (newRoomCount <= 0) {
      roomRefCounts.delete(productId);
      if (isConnected) sock.emit('leave_product', productId);
    } else {
      roomRefCounts.set(productId, newRoomCount);
    }

    consumerCount--;
    if (consumerCount <= 0 && socket) {
      socket.disconnect();
      socket = null;
      isConnected = false;
      consumerCount = 0;
    }
  };
}
