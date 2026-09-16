'use client';

import React from 'react';
import toast from 'react-hot-toast';
import { useEmailPreferences, useUpdateEmailPreferences } from '@/hooks/queries/useEmailPreferences';

/**
 * The marketing-email switch. Same consent record the footer signup and the unsubscribe link
 * write to, so turning it off here stops marketing email everywhere; order emails are unaffected.
 */
export default function EmailPreferences() {
  const { data, isLoading, isError } = useEmailPreferences();
  const update = useUpdateEmailPreferences();
  const marketing = data?.marketing ?? false;
  const busy = isLoading || update.isPending;

  const toggle = () => {
    const next = !marketing;
    update.mutate(next, {
      onSuccess: () => toast.success(next ? "You're subscribed to our emails" : 'Unsubscribed from marketing emails'),
      onError: () => toast.error('Could not save your preference. Please try again.'),
    });
  };

  return (
    <div className="tab text-content w-full rounded-xl border border-line p-7">
      <div className="heading5 pb-4">Email preferences</div>
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-title">News and offers</div>
          <p className="caption1 mt-1 text-secondary">
            New arrivals, deals and restocks. Emails about your orders, returns and account are always sent.
          </p>
          {isError && <p className="caption1 mt-2 text-red">Could not load your preference.</p>}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={marketing}
          aria-label="News and offers emails"
          disabled={busy || isError}
          onClick={toggle}
          className={`relative mt-1 h-7 w-12 shrink-0 rounded-full duration-300 disabled:opacity-50 ${marketing ? 'bg-black' : 'bg-line'}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow duration-300 ${marketing ? 'left-6' : 'left-1'}`}
          />
        </button>
      </div>
    </div>
  );
}
