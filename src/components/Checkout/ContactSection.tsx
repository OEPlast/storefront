'use client';

import React from 'react';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import CollapsibleSection from '@/components/ui/CollapsibleSection';
import { cn } from '@/libs/utils';
import type { GuestContact, GuestContactFieldErrors } from '@/libs/schemas/checkout.schema';

export interface ContactSectionProps {
  /** Resolved contact email: the account email when signed in. */
  email: string;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  /** Display name for the signed-in row. Optional. */
  userName?: string | null;
  /** Opens the login popup. Checkout keeps the shopper on the page rather than navigating away. */
  onSignInClick: () => void;
  /** Validation message for the email field (from CheckoutFieldErrors.email). */
  error?: string | null;

  // ---- guest checkout (signed out) ------------------------------------------
  guestEmail: string;
  onGuestEmailChange: (email: string) => void;
  /**
   * Pickup only. A delivery order collects name and phone on its shipping address, so asking
   * here too would make guests type them twice.
   */
  showGuestNameFields: boolean;
  guestContact: GuestContact;
  onGuestContactChange: <K extends keyof GuestContact>(field: K, value: GuestContact[K]) => void;
  guestContactErrors?: GuestContactFieldErrors;
  disabled?: boolean;
  className?: string;
}

const INPUT_CLASS = 'border border-line px-4 py-3 w-full rounded-lg';
const LABEL_CLASS = 'text-secondary text-sm mb-2 block';

/** Contact is always open, so CollapsibleSection gets a static header and an inert toggle. */
const noop = () => {};

const ContactSection: React.FC<ContactSectionProps> = ({
  email,
  isAuthenticated,
  isSessionLoading,
  userName,
  onSignInClick,
  error,
  guestEmail,
  onGuestEmailChange,
  showGuestNameFields,
  guestContact,
  onGuestContactChange,
  guestContactErrors,
  disabled = false,
  className,
}) => {
  const guestField = (
    field: keyof GuestContact,
    label: string,
    opts: { type?: string; autoComplete?: string } = {}
  ) => {
    const id = `checkout-guest-${field}`;
    const fieldError = guestContactErrors?.[field] ?? null;
    return (
      <div>
        <label className={LABEL_CLASS} htmlFor={id}>
          {label}
          <span className="ml-0.5 text-red">*</span>
        </label>
        <input
          id={id}
          name={id}
          type={opts.type ?? 'text'}
          autoComplete={opts.autoComplete}
          className={cn(INPUT_CLASS, fieldError && 'border-red-600')}
          value={guestContact[field]}
          onChange={(e) => onGuestContactChange(field, e.target.value)}
          disabled={disabled}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${id}-error` : undefined}
        />
        {fieldError && (
          <em id={`${id}-error`} className="mt-1 block text-sm text-red">
            {fieldError}
          </em>
        )}
      </div>
    );
  };

  return (
    <CollapsibleSection
      id="checkout-contact"
      title="Contact *"
      description="Order confirmation and receipts go to this email"
      icon={<Icon.User size={24} weight="duotone" className="" />}
      isExpanded
      onToggle={noop}
      hideToggle
      className={className}
    >
      {isSessionLoading ? (
        <div className="h-[52px] animate-pulse rounded-lg bg-gray-100" />
      ) : isAuthenticated ? (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-line px-4 py-3">
            <Icon.EnvelopeSimple
              size={20}
              weight="duotone"
              className="flex-shrink-0 text-secondary"
            />
            <div className="min-w-0">
              <div className="text-title truncate lowercase">{email}</div>
              {userName ? (
                <div className="caption1 mt-0.5 truncate text-secondary">{userName}</div>
              ) : null}
            </div>
            <Icon.CheckCircle
              size={20}
              weight="fill"
              className="ml-auto flex-shrink-0 text-green-600"
            />
          </div>
          {error ? <em className="mt-1 block text-sm text-red">{error}</em> : null}
        </>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <span className="caption1 text-secondary">Checking out as a guest</span>
            <span className="caption1 text-secondary">
              Have an account?{' '}
              <button
                type="button"
                onClick={onSignInClick}
                className="font-semibold text-black underline underline-offset-2 hover:no-underline"
              >
                Log in
              </button>
            </span>
          </div>

          <div>
            <label className={LABEL_CLASS} htmlFor="checkout-guest-email">
              Email address
              <span className="ml-0.5 text-red">*</span>
            </label>
            <input
              id="checkout-guest-email"
              name="checkout-guest-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className={cn(INPUT_CLASS, error && 'border-red-600')}
              value={guestEmail}
              onChange={(e) => onGuestEmailChange(e.target.value)}
              disabled={disabled}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'checkout-guest-email-error' : undefined}
            />
            {error ? (
              <em id="checkout-guest-email-error" className="mt-1 block text-sm text-red">
                {error}
              </em>
            ) : null}
          </div>

          {showGuestNameFields && (
            <div className="mt-5 grid gap-4 gap-y-5 sm:grid-cols-2">
              {guestField('firstName', 'First Name', { autoComplete: 'given-name' })}
              {guestField('lastName', 'Last Name', { autoComplete: 'family-name' })}
              {guestField('phoneNumber', 'Phone Number', { type: 'tel', autoComplete: 'tel' })}
            </div>
          )}
        </div>
      )}
    </CollapsibleSection>
  );
};

export default ContactSection;
