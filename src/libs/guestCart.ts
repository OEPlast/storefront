/**
 * Guest Cart Adapter - localStorage-based cart for unauthenticated users
 *
 * Key: 'oep-cart-1'
 * TTL: 24 hours (same as server cart)
 * Storage: localStorage with JSON serialization
 */

import type { CartProductSummary } from '@/types/cart';

const GUEST_CART_KEY = 'oep-cart-1';
const CART_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface GuestCartItem {
  _id: string; // Local ID (generated)
  product: string; // Product ID
  qty: number;
  selectedAttributes: Array<{
    name: string;
    value: string;
  }>;
  unitPrice: number;
  totalPrice: number;
  sale?: string; // Sale ID (if applicable)
  saleVariantIndex?: number;
  appliedDiscount?: number;
  discountAmount?: number;
  pricingTier?: {
    minQty: number;
    maxQty?: number;
    strategy: string;
    value: number;
    appliedPrice: number;
  };
  serverItemId?: string;
  addedAt: string; // ISO timestamp
  productSnapshot?: {
    name: string;
    price: number;
    sku: string | number;
    image?: string;
  } | null;
  productDetails?: CartProductSummary | null;
  isAvailable?: boolean; // Track if product/variant is in stock
  unavailableReason?: 'out_of_stock' | 'variant_unavailable';
}

export interface GuestCart {
  items: GuestCartItem[];
  lastUpdated: string; // ISO timestamp
}

/**
 * Generate a unique local ID for cart items
 */
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if a cart item is expired (older than 24 hours)
 */
function isItemExpired(addedAt: string): boolean {
  const itemDate = new Date(addedAt).getTime();
  const now = Date.now();
  return now - itemDate > CART_TTL_MS;
}

/**
 * Purge expired items from cart
 */
function purgeExpiredItems(items: GuestCartItem[]): GuestCartItem[] {
  return items.filter((item) => !isItemExpired(item.addedAt));
}

/**
 * Read guest cart from localStorage (SSR-safe)
 * Automatically purges expired items
 */
export function getGuestCart(): GuestCart {
  try {
    if (typeof window === 'undefined') {
      // SSR render path: return empty cart to avoid window access
      return { items: [], lastUpdated: new Date().toISOString() };
    }
    const stored = window.localStorage.getItem(GUEST_CART_KEY);
    if (!stored) {
      return { items: [], lastUpdated: new Date().toISOString() };
    }

    const cart: GuestCart = JSON.parse(stored);

    // Purge expired items
    const validItems = purgeExpiredItems(cart.items);

    // If items were purged, update storage
    if (validItems.length !== cart.items.length) {
      const updatedCart: GuestCart = {
        items: validItems,
        lastUpdated: new Date().toISOString(),
      };
      window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(updatedCart));
      return updatedCart;
    }

    return cart;
  } catch (error) {
    console.error('Error reading guest cart:', error);
    return { items: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Write guest cart to localStorage
 */
function saveGuestCart(cart: GuestCart): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    // Dispatch custom event to notify all components
    window.dispatchEvent(new CustomEvent('guestCartUpdated', { detail: cart }));
  } catch (error) {
    console.error('Error saving guest cart:', error);
  }
}

/**
 * Set entire guest cart (used for syncing from server)
 */
export function setGuestCart(cart: GuestCart): void {
  saveGuestCart(cart);
}

/**
 * Check if two items are identical (same product + attributes)
 */
export function areCartItemsIdentical(
  item1: { product: string; selectedAttributes: Array<{ name: string; value: string }> },
  item2: { product: string; selectedAttributes: Array<{ name: string; value: string }> }
): boolean {
  if (item1.product !== item2.product) return false;

  // Compare attributes
  if (item1.selectedAttributes.length !== item2.selectedAttributes.length) return false;

  const attrs1 = [...item1.selectedAttributes].sort((a, b) => a.name.localeCompare(b.name));
  const attrs2 = [...item2.selectedAttributes].sort((a, b) => a.name.localeCompare(b.name));

  return attrs1.every(
    (attr, idx) => attr.name === attrs2[idx].name && attr.value === attrs2[idx].value
  );
}

/**
 * Add item to guest cart
 * If identical item exists, sum quantities
 */
type GuestCartOverrides = {
  id?: string;
  serverItemId?: string;
  unitPrice?: number;
  totalPrice?: number;
  appliedDiscount?: number;
  discountAmount?: number;
  pricingTier?: GuestCartItem['pricingTier'];
  addedAt?: string;
};

export function addToGuestCart(
  productId: string,
  qty: number,
  attributes: Array<{ name: string; value: string }>,
  productSnapshot: { name: string; price: number; sku: string | number; image?: string },
  unitPrice: number,
  sale?: string,
  saleVariantIndex?: number,
  overrides?: GuestCartOverrides
): GuestCartItem {
  const cart = getGuestCart();

  // Check if identical item exists
  const existingItemIndex = cart.items.findIndex((item) =>
    areCartItemsIdentical(
      { product: item.product, selectedAttributes: item.selectedAttributes },
      { product: productId, selectedAttributes: attributes }
    )
  );

  const resolvedUnitPrice = overrides?.unitPrice ?? unitPrice;
  const now = overrides?.addedAt ?? new Date().toISOString();

  let updatedItem: GuestCartItem;

  if (existingItemIndex !== -1) {
    // Update existing item quantity
    const existingItem = cart.items[existingItemIndex];
    const newQty = existingItem.qty + qty;
    updatedItem = {
      ...existingItem,
      qty: newQty,
      unitPrice: resolvedUnitPrice,
      totalPrice: overrides?.totalPrice ?? resolvedUnitPrice * newQty,
      sale,
      saleVariantIndex,
      appliedDiscount: overrides?.appliedDiscount ?? existingItem.appliedDiscount,
      discountAmount: overrides?.discountAmount ?? existingItem.discountAmount,
      pricingTier: overrides?.pricingTier ?? existingItem.pricingTier,
      serverItemId: overrides?.serverItemId ?? existingItem.serverItemId,
      addedAt: now, // Refresh TTL
    };
    cart.items[existingItemIndex] = updatedItem;
  } else {
    // Add new item
    updatedItem = {
      _id: overrides?.id ?? generateLocalId(),
      product: productId,
      qty,
      selectedAttributes: attributes,
      productSnapshot,
      unitPrice: resolvedUnitPrice,
      totalPrice: overrides?.totalPrice ?? resolvedUnitPrice * qty,
      sale,
      saleVariantIndex,
      appliedDiscount: overrides?.appliedDiscount,
      discountAmount: overrides?.discountAmount,
      pricingTier: overrides?.pricingTier,
      serverItemId: overrides?.serverItemId,
      addedAt: now,
    };
    cart.items.push(updatedItem);
  }

  cart.lastUpdated = now;
  saveGuestCart(cart);

  console.log('✅ Item added to guest cart:', updatedItem);
  console.log('📦 Total items in cart:', cart.items.length);

  return updatedItem;
}

/**
 * Update guest cart item (quantity or attributes)
 */
export function updateGuestCartItem(
  itemId: string,
  updates: {
    qty?: number;
    selectedAttributes?: Array<{ name: string; value: string }>;
    unitPrice?: number;
    totalPrice?: number;
    productSnapshot?: GuestCartItem['productSnapshot'];
    sale?: string;
    saleVariantIndex?: number;
    appliedDiscount?: number;
    discountAmount?: number;
    pricingTier?: GuestCartItem['pricingTier'];
    serverItemId?: string | null;
    productDetails?: CartProductSummary | null;
    addedAt?: string;
  }
): GuestCartItem | null {
  const cart = getGuestCart();
  const itemIndex = cart.items.findIndex((item) => item._id === itemId);

  if (itemIndex === -1) {
    console.error(`Guest cart item not found: ${itemId}`);
    return null;
  }

  const item = cart.items[itemIndex];

  // Apply updates
  if (updates.qty !== undefined) {
    item.qty = updates.qty;
  }

  if (updates.unitPrice !== undefined) {
    item.unitPrice = updates.unitPrice;
  }

  if (updates.totalPrice !== undefined) {
    item.totalPrice = updates.totalPrice;
  } else if (updates.qty !== undefined || updates.unitPrice !== undefined) {
    item.totalPrice = item.unitPrice * item.qty;
  }

  if (updates.selectedAttributes !== undefined) {
    item.selectedAttributes = updates.selectedAttributes;
  }

  if (updates.productSnapshot) {
    item.productSnapshot = updates.productSnapshot;
  }

  if (updates.sale !== undefined) {
    item.sale = updates.sale;
  }

  if (updates.saleVariantIndex !== undefined) {
    item.saleVariantIndex = updates.saleVariantIndex;
  }

  if (updates.appliedDiscount !== undefined) {
    item.appliedDiscount = updates.appliedDiscount;
  }

  if (updates.discountAmount !== undefined) {
    item.discountAmount = updates.discountAmount;
  }

  if (updates.pricingTier !== undefined) {
    item.pricingTier = updates.pricingTier;
  }

  if (updates.serverItemId !== undefined) {
    item.serverItemId = updates.serverItemId ?? undefined;
  }

  if (updates.productDetails !== undefined) {
    item.productDetails = updates.productDetails;
  }

  item.addedAt = updates.addedAt ?? new Date().toISOString(); // Refresh TTL
  cart.items[itemIndex] = item;
  cart.lastUpdated = new Date().toISOString();

  saveGuestCart(cart);
  return item;
}

/**
 * Remove item from guest cart
 */
export function removeFromGuestCart(itemId: string): boolean {
  const cart = getGuestCart();
  const initialLength = cart.items.length;

  cart.items = cart.items.filter((item) => item._id !== itemId);

  if (cart.items.length < initialLength) {
    cart.lastUpdated = new Date().toISOString();
    saveGuestCart(cart);
    return true;
  }

  return false;
}

/**
 * Clear entire guest cart
 */
export function clearGuestCart(): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(GUEST_CART_KEY);
  } catch (error) {
    console.error('Error clearing guest cart:', error);
  }
}

/**
 * Get guest cart item count
 */
export function getGuestCartItemCount(): number {
  const cart = getGuestCart();
  return cart.items.reduce((count, item) => count + item.qty, 0);
}

/**
 * Get guest cart totals
 */
export function getGuestCartTotals(): {
  itemCount: number;
  subtotal: number;
  total: number;
} {
  const cart = getGuestCart();
  const itemCount = cart.items.reduce((count, item) => count + item.qty, 0);
  const subtotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

  return {
    itemCount,
    subtotal,
    total: subtotal, // No shipping/tax for guest carts yet
  };
}

/**
 * Check if guest cart exists and has items
 */
export function hasGuestCart(): boolean {
  const cart = getGuestCart();
  return cart.items.length > 0;
}
