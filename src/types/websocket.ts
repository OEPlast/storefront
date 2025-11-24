/**
 * WebSocket Types for Storefront
 * Duplicated from websocket-gateway for type safety
 */

// Base event interface
export interface BaseEvent {
  type: string;
  timestamp: Date;
}

// Product event data
export interface ProductEventData extends BaseEvent {
  productId: string;
  type: "product_update" | "inventory_update" | "price_update";
  data: ProductUpdateData | InventoryUpdateData | PriceUpdateData;
}

// Product update event
export interface ProductUpdateData {
  productId: string;
  name: string;
  price: number;
  stock: number;
  action: "created" | "updated" | "deleted";
  timestamp: string;
}

// Inventory update event
export interface InventoryUpdateData {
  productId: string;
  productName: string;
  currentStock: number;
  previousStock: number;
  timestamp: string;
}

// Price update event
export interface PriceUpdateData {
  productId: string;
  oldPrice: number;
  newPrice: number;
  discountPercentage?: number;
  timestamp: string;
}

// Batched product update
export interface BatchedProductUpdate {
  productId: string;
  events: ProductEventData[];
  timestamp: string;
  count: number;
}

// Client to Server Events
export interface ClientToServerEvents {
  // Product room management
  join_product: (productId: string) => void;
  leave_product: (productId: string) => void;
  request_sync: (productId: string, lastTimestamp?: string) => void;

  // Health check
  ping: () => void;

  // Authenticated user events (optional, not used for product updates)
  join_user_room: (userId: string) => void;
  leave_user_room: (userId: string) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  // Batched product updates
  batched_product_update: (update: BatchedProductUpdate) => void;

  // Health check response
  pong: () => void;

  // Error handling
  error: (error: { message: string; code?: string }) => void;

  // Connection acknowledgment
  connected: (data: { socketId: string; authenticated: boolean }) => void;
}

// WebSocket notification from event-bus
export interface WebSocketNotification {
  type: "product_update" | "inventory_update" | "price_update";
  data: ProductUpdateData | InventoryUpdateData | PriceUpdateData;
}

// Socket connection status
export type SocketStatus = "connecting" | "connected" | "disconnected" | "error";

// Product subscription tracker
export interface ProductSubscription {
  productId: string;
  subscribedAt: Date;
  lastUpdate?: Date;
}
