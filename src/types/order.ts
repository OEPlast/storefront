// Order types matching backend schema

export interface OrderAddress {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  lga?: string;
}

export interface OrderProductAttribute {
  name: string;
  value: string;
}

export interface OrderProduct {
  product: string; // Product ID
  qty: number;
  price: number;
  attributes: OrderProductAttribute[];
  sale?: string; // Sale ID
  saleType?: 'Flash' | 'Limited' | 'Normal';
  saleVariantIndex?: number;
  saleDiscount?: number;
}

export interface CouponAppliesTo {
  scope: 'order' | 'product' | 'category';
  productIds?: string[];
  categoryIds?: string[];
}

export interface CouponSnapshot {
  discount: number;
  discountType: 'percentage' | 'fixed';
  appliesTo: CouponAppliesTo;
}

export interface PaymentResult {
  id: string;
  status: string;
  email: string;
}

export interface FlashSaleApplied {
  flashSale: string; // Sale ID
  product: string; // Product ID
  attributeName?: string | null;
  attributeValue?: string | null;
  discount: number;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Cancelled' | 'Completed' | 'Failed';
export type DeliveryType = 'shipping' | 'pickup' | 'gig';

export interface OrderType {
  _id: string;
  user: string; // User ID
  products: OrderProduct[];
  shippingAddress: OrderAddress;
  paymentMethod: string;
  paymentResult?: PaymentResult;
  total: number;
  totalBeforeDiscount?: number;
  couponApplied?: string;
  coupon?: string; // Coupon ID
  couponCode?: string;
  couponDiscount: number;
  couponSnapshot?: CouponSnapshot;
  deliveryType: DeliveryType;
  shippingPrice: number;
  taxPrice: number;
  transactionId?: string | null; // Transaction ID
  isPaid: boolean;
  status: OrderStatus;
  shipmentId?: string | null; // Shipment ID
  paidAt?: string | Date;
  deliveredAt?: string | Date;
  flashSaleApplied?: FlashSaleApplied[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

// Query params for fetching orders
export interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: 'Pending' | 'Processing' | 'Cancelled' | 'Completed' | 'Failed' | 'All';
  deliveryStatus?: 'Pending' | 'Processing' | 'shipped' | 'delivered' | 'failed';
}

// Response type with pagination meta
export interface OrdersResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Enhanced product type with populated details (for order history)
export interface EnrichedOrderProduct {
  _id: string;
  name: string;
  slug: string;
  image?: string;
  quantity: number;
  price: number;
  attributes: OrderProductAttribute[];
  sale?: string | null;
  saleDiscount: number;
}

// Order history type with enriched products and summary fields
export interface OrderHistoryType extends Omit<OrderType, 'products'> {
  products: EnrichedOrderProduct[];
  totalProducts: number; // Total count of all products in order
  totalItems: number; // Sum of all product quantities
}

export interface OrdersResponse {
  orders: OrderHistoryType[]; // Changed from OrderType[]
  meta: OrdersResponseMeta;
}

// Enriched order response type with populated details from backend
export interface EnrichedOrder {
  _id: string;
  orderNumber: string;

  // Order summary
  total: number;
  totalBeforeDiscount: number;
  couponDiscount: number;
  shippingPrice: number;
  taxPrice: number;
  status: OrderStatus;
  isPaid: boolean;
  deliveryType: DeliveryType;
  gigWaybill?: string | null;
  deliveryStatus?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
  paidAt?: string | Date;
  deliveredAt?: string | Date;

  // Coupon info
  coupon: {
    code?: string;
    discount: number;
    name?: string;
  };

  // Contact information
  contact: {
    name: string;
    phone?: string;
    email: string;
  };

  // Addresses
  shippingAddress: OrderAddress | null;
  billingAddress: OrderAddress | null;

  // Products with enriched details
  products: Array<{
    _id: string;
    name: string;
    slug: string;
    image?: string;
    quantity: number;
    price: number;
    attributes: Array<{ name: string; value: string }>;
    sale?: string | null;
    saleDiscount: number;
  }>;

  // Transaction details
  transaction: {
    _id: string;
    reference: string;
    amount: number;
    paymentMethod: string;
    paymentGateway: string;
    status: string;
    paidAt?: string | Date;
    transactionDate: string | Date;
  } | null;

  // Shipment details
  shipment: {
    _id: string;
    trackingNumber: string;
    status: string;
    courier?: string;
    estimatedDelivery?: string | Date;
    deliveredOn?: string | Date;
    shippingAddress: OrderAddress;
    trackingHistory: Array<{
      location?: string;
      timestamp: string | Date;
      description?: string;
    }>;
    cost: number;
  } | null;
}
