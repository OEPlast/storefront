'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import { useAccountStore } from '@/store/accountStore';
import { useMyReturns } from '@/hooks/queries/useReturns';
import ReturnStatusCard from '@/components/Order/ReturnStatusCard';

/** The Returns tab of the account: every return request the customer has made. */
export default function MyReturns() {
  const { activeTab } = useAccountStore();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyReturns(page, 10);

  if (activeTab !== 'returns') return null;

  const returns = data?.returns ?? [];
  const pages = data?.meta?.pages ?? 1;

  return (
    <div className="returns">
      <h5 className="heading5">Returns</h5>
      <p className="mt-1 text-sm text-secondary">
        To return something, open the order from your <button type="button" className="underline" onClick={() => useAccountStore.getState().setActiveTab('orders')}>orders</button> and choose &ldquo;Request a return&rdquo;.
      </p>

      {isLoading && (
        <div className="mt-6 flex items-center gap-2 text-secondary">
          <Icon.CircleNotch className="animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && returns.length === 0 && (
        <div className="mt-6 rounded-xl border border-line p-8 text-center">
          <Icon.ArrowUUpLeft size={40} className="mx-auto mb-3 text-secondary" />
          <p className="text-secondary">You haven&apos;t requested any returns.</p>
          <Link href="/my-account" onClick={() => useAccountStore.getState().setActiveTab('orders')} className="button-main mt-4 inline-block">
            View orders
          </Link>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {returns.map((request) => (
          <ReturnStatusCard key={request._id} request={request} showOrderLink />
        ))}
      </div>

      {pages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-4 py-2 text-sm disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-secondary">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-4 py-2 text-sm disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
