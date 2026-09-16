'use client';

import React, { useEffect, useMemo, useState } from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import type { EnrichedOrder } from '@/types/order';
import { useOrderReturns } from '@/hooks/queries/useReturns';
import ReturnStatusCard from './ReturnStatusCard';
import RequestReturnForm, { returnEligibility } from './RequestReturnForm';
import { useStoreConfig } from '@/context/StoreConfigContext';

interface OrderReturnsSectionProps {
  order: EnrichedOrder;
  /** Open the request form straight away (the "start a return" email link lands here with ?tab=returns). */
  openForm?: boolean;
}

/** The returns panel on an order: existing requests, plus the button and form to start one. */
export default function OrderReturnsSection({ order, openForm = false }: OrderReturnsSectionProps) {
  const { data, isLoading } = useOrderReturns(order._id);
  const [showForm, setShowForm] = useState(false);
  const { policies } = useStoreConfig();
  const eligibility = returnEligibility(order, policies.returnWindowDays);

  const returns = data?.returns ?? [];
  const alreadyReturned = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const request of returns) {
      if (['rejected', 'cancelled'].includes(request.status)) continue;
      for (const item of request.items) {
        const id = typeof item.product === 'object' && item.product ? item.product._id : String(item.product);
        counts[id] = (counts[id] ?? 0) + item.qty;
      }
    }
    return counts;
  }, [returns]);

  const everythingReturned = order.products.every((p) => (alreadyReturned[p._id] ?? 0) >= p.quantity);
  const canRequest = eligibility.eligible && !everythingReturned;

  useEffect(() => {
    if (openForm && canRequest && !isLoading) setShowForm(true);
  }, [openForm, canRequest, isLoading]);

  // Nothing to show for an order that was never delivered and has no returns.
  if (!isLoading && returns.length === 0 && order.status !== 'Completed') return null;

  return (
    <div id="returns" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h6 className="heading6">Returns</h6>
        {canRequest && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2 text-sm font-semibold duration-300 hover:bg-black hover:text-white"
          >
            <Icon.ArrowUUpLeft weight="bold" /> Request a return
          </button>
        )}
      </div>

      {showForm && (
        <RequestReturnForm order={order} alreadyReturned={alreadyReturned} onClose={() => setShowForm(false)} onSubmitted={() => setShowForm(false)} />
      )}

      {!showForm && !canRequest && order.status === 'Completed' && (
        <p className="text-sm text-secondary">
          {everythingReturned ? 'Every item on this order is already in a return request.' : eligibility.reason}
        </p>
      )}
      {!showForm && canRequest && returns.length === 0 && (
        <p className="text-sm text-secondary">Something not right? You have {policies.returnWindowDays} days from delivery to send it back.</p>
      )}

      {returns.map((request) => (
        <ReturnStatusCard key={request._id} request={request} />
      ))}
    </div>
  );
}
