// Coupon Types for Frontend

export type CouponType = 'one-off' | 'one-off-user' | 'one-off-for-one-person' | 'normal';

export type DiscountType = 'percentage' | 'fixed';

export type ScopeType = 'order' | 'product' | 'category';

export interface AppliesTo {
  scope: ScopeType;
  productIds?: string[];
  categoryIds?: string[];
}

export interface Coupon {
  _id: string;
  coupon: string; // Coupon code
  discountType: DiscountType;
  discount: number; // Discount amount
  maxDiscountAmount?: number;
  minOrderValue: number;
  startDate?: string;
  endDate: string;
  maxUsage?: number;
  usedCount?: number;
  active?: boolean;
  couponType: CouponType;
  appliesTo?: AppliesTo;
  stackable?: boolean;
  description?: string;
  usedBy?: string[];
  showOnCartPage?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Request/Response types for API
export interface ValidateCouponRequest {
  code: string; // Note: API expects 'code' for validation
  orderTotal: number;
  /** Cart lines; the server prices them to work out the coupon's discount. */
  items?: Array<{ product: string; qty: number; selectedAttributes?: Array<{ name: string; value: string }> }>;
  productIds?: string[];
  categoryIds?: string[];
  userId?: string;
  /** Guest checkout email, so one-per-customer rules apply to guests with an account email too. */
  email?: string;
}

export interface ValidateCouponResponse {
  success: boolean;
  valid: boolean;
  message: string;
  data?: {
    coupon: {
      _id: string;
      code: string;
      discount: number;
      discountType: DiscountType;
      minOrderValue: number;
      appliesTo: AppliesTo;
      stackable: boolean;
    };
    discount: number; // Calculated discount amount
    discountType: DiscountType;
    appliesTo: AppliesTo;
  };
}

export interface CouponApiResponse<T = Coupon> {
  code: number;
  message: string;
  data: T | null;
}
