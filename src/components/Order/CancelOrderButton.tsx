'use client';

import React, { useState } from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import toast from 'react-hot-toast';
import { useCancelOrder } from '@/hooks/mutations/useOrderMutations';
import ConfirmModal from '@/components/Modal/ConfirmModal';

interface CancelOrderButtonProps {
  orderId: string;
  orderNumber: string;
  /** `solid` for the order details page, `subtle` for the compact order list card */
  variant?: 'solid' | 'subtle';
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function CancelOrderButton({
  orderId,
  orderNumber,
  variant = 'solid',
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
        reason: cancelReason.trim() || undefined,
      });

      setShowConfirm(false);
      setCancelReason('');
      toast.success(result.message || 'Order cancelled');
      onSuccess?.();
    } catch (error) {
      const err = error as Error;
      toast.error(err.message || 'Could not cancel this order');
      onError?.(err);
      setShowConfirm(false);
    }
  };

  const buttonClass =
    variant === 'subtle'
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-secondary duration-300 hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-50'
      : 'button-main bg-red text-white hover:bg-red/90';

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        className={buttonClass}
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
        isLoading={cancelOrder.isPending}
        message={
          <span className="block space-y-4 text-left">
            <span className="block text-center">
              Cancel order <strong className="uppercase">{orderNumber}</strong>? Items go back to
              stock and any payment made is refunded.
            </span>
            <span className="block">
              <label htmlFor="cancelReason" className="mb-2 block text-sm font-medium text-title">
                Reason (optional)
              </label>
              <textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full resize-none rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red"
                rows={3}
                placeholder="e.g. Changed my mind, ordered the wrong size..."
              />
            </span>
          </span>
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
