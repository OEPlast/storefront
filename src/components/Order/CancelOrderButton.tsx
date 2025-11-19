'use client';

import React, { useState } from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { useCancelOrder } from '@/hooks/mutations/useOrderMutations';
import ConfirmModal from '@/components/Modal/ConfirmModal';

interface CancelOrderButtonProps {
  orderId: string;
  orderNumber: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function CancelOrderButton({
  orderId,
  orderNumber,
  onSuccess,
  onError,
}: CancelOrderButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const cancelOrder = useCancelOrder();

  const handleConfirmCancel = async () => {
    try {
      const result = await cancelOrder.mutateAsync({
        orderId,
        reason: cancelReason || undefined,
      });

      setShowConfirm(false);
      setCancelReason('');

      // Show success message with stock reversal details
      if (result.stockReversals.length > 0) {
        const reversalSummary = result.stockReversals
          .map((r) => `${r.productName}: +${r.quantityReversed} stock`)
          .join(', ');
        console.log('Stock reversed:', reversalSummary);
      }

      if (result.salesReversals.length > 0) {
        const salesSummary = result.salesReversals
          .map((r) => `${r.productName}: -${r.salesDeducted} sales`)
          .join(', ');
        console.log('Sales deducted:', salesSummary);
      }

      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
      setShowConfirm(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        className="button-main bg-red hover:bg-red/90 text-white"
        disabled={cancelOrder.isPending}
      >
        {cancelOrder.isPending ? (
          <>
            <Icon.CircleNotch className="animate-spin" />
            Cancelling...
          </>
        ) : (
          <>
            <Icon.X weight="bold" />
            Cancel Order
          </>
        )}
      </button>

      <ConfirmModal
        isOpen={showConfirm}
        title="Cancel Order"
        message={
          <div className="space-y-4">
            <p>
              Are you sure you want to cancel order <strong>#{orderNumber}</strong>?
            </p>
            <p className="text-sm text-secondary">
              This action will:
            </p>
            <ul className="text-sm text-secondary list-disc list-inside space-y-1">
              <li>Reverse product stock for all items in this order</li>
              <li>Deduct sales count from product statistics</li>
              <li>Update order status to &quot;Cancelled&quot;</li>
              <li>Process any applicable refunds (if payment was made)</li>
            </ul>
            <div className="mt-4">
              <label htmlFor="cancelReason" className="block text-sm font-medium mb-2">
                Reason for cancellation (optional)
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded-lg focus:outline-none focus:ring-2 focus:ring-red resize-none"
                rows={3}
                placeholder="e.g., Changed mind, found better price, delivery too slow..."
              />
            </div>
          </div>
        }
        variant="danger"
        confirmText="Yes, Cancel Order"
        cancelText="Keep Order"
        onConfirm={handleConfirmCancel}
        onCancel={() => {
          setShowConfirm(false);
          setCancelReason('');
        }}
      />
    </>
  );
}
