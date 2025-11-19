// Shipment type matching backend Shipment model
export interface IShipment {
  _id: string;
  orderId: {
    _id: string;
    orderNumber: string;
    total: number;
    status: string;
  };
  trackingNumber: string;
  courier?: string;
  courierUser?: string;
  status: 'In-Warehouse' | 'Shipped' | 'Dispatched' | 'Delivered' | 'Returned' | 'Failed';
  estimatedDelivery?: string | Date;
  deliveredOn?: string | Date;
  shippingAddress: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  cost: number;
  notes?: string;
  trackingHistory: Array<{
    location?: string;
    timestamp: string | Date;
    description?: string;
    _id?: string;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// API Response type
export interface TrackShipmentResponse {
  message: string;
  code: number;
  data: IShipment;
}
