'use client';

import React from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { RETURN_REASON_LABELS, RETURN_STATUS_LABELS, type ReturnRequest } from '@/types/return';
import { useCancelReturn } from '@/hooks/mutations/useReturnMutations';
import { formatToNaira } from '@/utils/currencyFormatter';

const TONE_CLASS: Record<string, string> = {
  pending: 'bg-yellow text-yellow',
  progress: 'bg-purple text-purple',
  good: 'bg-success text-success',
  bad: 'bg-red text-red',
  neutral: 'bg-secondary text-secondary',
};

/** Statuses the customer can still withdraw from. */
const CANCELLABLE = ['pending', 'approved'];

const productName = (item: ReturnRequest['items'][number]) =>
  item.product && typeof item.product === 'object' ? item.product.name : 'Product';

interface ReturnStatusCardProps {
  request: ReturnRequest;
  /** Show the "View order" link (on the account returns tab, not on the order page itself). */
  showOrderLink?: boolean;
}

/** One return request: what was sent back, where it is in the process, and what happens next. */
export default function ReturnStatusCard({ request, showOrderLink = false }: ReturnStatusCardProps) {
  const cancelReturn = useCancelReturn();
  const status = RETURN_STATUS_LABELS[request.status] ?? RETURN_STATUS_LABELS.pending;
  const orderId = typeof request.order === 'object' ? request.order._id : request.order;
  const orderNumber = typeof request.order === 'object' ? request.order.orderNumber : undefined;

  const handleCancel = async () => {
    if (!window.confirm('Withdraw this return request?')) return;
    try {
      const result = await cancelReturn.mutateAsync({ returnId: request._id, orderId });
      toast.success(result.message || 'Return request cancelled');
    } catch (error) {
      toast.error((error as Error).message || 'Could not cancel this return');
    }
  };

  return (
    <div className="rounded-xl border border-line p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-title font-semibold">Return {request.returnNumber}</div>
          <div className="caption1 mt-1 text-secondary">
            Requested {new Date(request.requestedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            {orderNumber ? ` · Order ${orderNumber}` : ''}
          </div>
        </div>
        <span className={`tag caption1 rounded-full bg-opacity-10 px-3 py-1 font-semibold ${TONE_CLASS[status.tone]}`}>
          {status.label}
        </span>
      </div>

      <p className="mt-3 text-sm text-secondary">{status.description}</p>

      <ul className="mt-4 space-y-2 border-t border-line pt-4">
        {request.items.map((item, index) => (
          <li key={index} className="flex items-start justify-between gap-3 text-sm">
            <div>
              <span className="text-title">{productName(item)}</span>
              <span className="text-secondary"> × {item.qty}</span>
              <div className="caption1 text-secondary">{RETURN_REASON_LABELS[item.reason] ?? item.reason}</div>
            </div>
            {typeof item.refundAmount === 'number' && <span className="text-title">{formatToNaira(item.refundAmount)}</span>}
          </li>
        ))}
      </ul>

      {typeof request.totalRefundAmount === 'number' && (
        <div className="mt-3 flex justify-between border-t border-line pt-3 text-sm">
          <span className="text-secondary">Refund</span>
          <span className="text-title font-semibold">{formatToNaira(request.totalRefundAmount)}</span>
        </div>
      )}

      {request.adminNotes && request.status !== 'pending' && (
        <div className="mt-3 rounded-lg bg-surface p-3 text-sm">
          <span className="font-semibold text-title">Note from us: </span>
          <span className="text-secondary">{request.adminNotes}</span>
        </div>
      )}

      {(CANCELLABLE.includes(request.status) || showOrderLink) && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {showOrderLink && orderId && (
            <Link href={`/my-account/orders/${orderId}`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold duration-300 hover:bg-black hover:text-white">
              View order <Icon.CaretRight weight="bold" />
            </Link>
          )}
          {CANCELLABLE.includes(request.status) && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelReturn.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold text-secondary duration-300 hover:border-red hover:text-red disabled:opacity-50"
            >
              {cancelReturn.isPending ? <Icon.CircleNotch className="animate-spin" /> : <Icon.X weight="bold" />}
              Withdraw request
            </button>
          )}
        </div>
      )}
    </div>
  );
}
