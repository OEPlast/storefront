import type { Product } from '@/types/product';

export interface CartProductSummary {
  _id: string;
  name?: string;
  slug?: string;
  price?: number;
  sku?: string | number;
  stock?: number;
  attributes?: Product['attributes'];
  description_images?: Product['description_images'];
  pricingTiers?: Product['pricingTiers'];
}

export interface CartItem {
  _id: string;
  product: string;
  qty: number;
  productSnapshot?: {
    name: string;
    price: number;
    sku: string | number;
    image?: string;
  };
  selectedAttributes: Array<{
    name: string;
    value: string;
  }>;
  productDetails?: CartProductSummary | null;
  unitPrice: number;
  totalPrice: number;
  sale?: string;
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
  addedAt: string;
  isAvailable?: boolean;
  unavailableReason?: 'out_of_stock' | 'variant_unavailable';
}

export interface AppliedCoupon {
  coupon: string;
  code: string;
  couponDetails?: {
    _id?: string;
    coupon?: string;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
    minOrderValue?: number;
    maxDiscount?: number;
    active?: boolean;
    startDate?: string;
    endDate?: string;
    usageLimit?: number;
    timesUsed?: number;
  } | null;
  discountAmount: number;
  appliedAt: string;
}

export interface ServerCart {
  _id: string;
  user: string;
  items: CartItem[];
  subtotal: number;
  totalDiscount: number;
  couponDiscount: number;
  total: number;
  appliedCoupons: AppliedCoupon[];
  status: 'active' | 'abandoned' | 'converted';
  estimatedShipping: {
    cost: number;
    days: number;
  };
  lastActivity: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartSnapshotPayload {
  items: Array<{
    _id?: string;
    product: string;
    qty: number;
    unitPrice: number;
    totalPrice?: number;
    selectedAttributes?: Array<{ name: string; value: string }>;
    productSnapshot?: CartItem['productSnapshot'];
    sale?: string;
    saleVariantIndex?: number;
    appliedDiscount?: number;
    discountAmount?: number;
    pricingTier?: CartItem['pricingTier'];
    serverItemId?: string;
    addedAt?: string;
  }>;
  subtotal?: number;
  total?: number;
  totalDiscount?: number;
  estimatedShipping?: {
    cost: number;
    days: number;
  };
}
