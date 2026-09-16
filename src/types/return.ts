export type ReturnStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'items_received'
  | 'inspecting'
  | 'inspection_passed'
  | 'inspection_failed'
  | 'completed'
  | 'cancelled';

export type ReturnReason =
  | 'defective'
  | 'wrong_item'
  | 'damaged'
  | 'not_as_described'
  | 'size_issue'
  | 'color_issue'
  | 'quality_issue'
  | 'changed_mind'
  | 'late_delivery'
  | 'other';

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  defective: "It doesn't work / is faulty",
  damaged: 'It arrived damaged',
  wrong_item: 'I received the wrong item',
  not_as_described: "It's not as described",
  size_issue: 'Wrong size',
  color_issue: 'Wrong colour',
  quality_issue: 'Poor quality',
  changed_mind: 'I changed my mind',
  late_delivery: 'It arrived too late',
  other: 'Something else',
};

/** Plain-language status labels; the raw values are internal workflow states. */
export const RETURN_STATUS_LABELS: Record<ReturnStatus, { label: string; description: string; tone: 'pending' | 'progress' | 'good' | 'bad' | 'neutral' }> = {
  pending: { label: 'Under review', description: "We're reviewing your request. You'll hear from us within 1–2 business days.", tone: 'pending' },
  approved: { label: 'Approved', description: 'Send the items back using the instructions we emailed you.', tone: 'progress' },
  items_received: { label: 'Items received', description: 'Your parcel has arrived. We will inspect it within 2–3 business days.', tone: 'progress' },
  inspecting: { label: 'Being inspected', description: 'We are checking the returned items.', tone: 'progress' },
  inspection_passed: { label: 'Inspection passed', description: 'Your refund is being arranged.', tone: 'good' },
  inspection_failed: { label: 'Inspection issue', description: 'There was a problem with the returned items. Check your email for details.', tone: 'bad' },
  completed: { label: 'Refunded', description: 'Your refund has been issued.', tone: 'good' },
  rejected: { label: 'Not approved', description: 'We could not accept this return. Check your email for the reason.', tone: 'bad' },
  cancelled: { label: 'Cancelled', description: 'This return request was cancelled.', tone: 'neutral' },
};

export interface ReturnItem {
  product: { _id: string; name: string; slug?: string; description_images?: Array<{ url?: string; cover_image?: boolean }> } | string | null;
  qty: number;
  reason: ReturnReason;
  reasonDetails?: string;
  images?: string[];
  refundAmount?: number;
}

export interface ReturnRequest {
  _id: string;
  returnNumber: string;
  order: { _id: string; orderNumber?: string; total: number; createdAt: string } | string;
  items: ReturnItem[];
  type: 'refund' | 'exchange';
  status: ReturnStatus;
  totalRefundAmount: number | null;
  customerNotes?: string;
  adminNotes?: string;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReturnInput {
  orderId: string;
  items: Array<{ product: string; qty: number; reason: ReturnReason; reasonDetails?: string; images?: string[] }>;
  type: 'refund';
  customerNotes?: string;
}
