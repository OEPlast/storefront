'use client';

import React from 'react';
import Link from 'next/link';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import CollapsibleSection from '@/components/ui/CollapsibleSection';

export interface ContactSectionProps {
  /** Resolved contact email. Empty string while signed out. */
  email: string;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
  /** Display name for the signed-in row. Optional. */
  userName?: string | null;
  /** Relative path only. Default '/checkout'. Rendered as /login?callbackUrl=<encoded>. */
  callbackUrl?: string;
  /** When provided, renders a button that opens the login modal in place of a hard nav. */
  onSignInClick?: () => void;
  /** Validation message for the email field (from CheckoutFieldErrors.email). */
  error?: string | null;
  className?: string;
}

/** Contact is always open, so CollapsibleSection gets a static header and an inert toggle. */
const noop = () => {};

const ContactSection: React.FC<ContactSectionProps> = ({
  email,
  isAuthenticated,
  isSessionLoading,
  userName,
  callbackUrl = '/checkout',
  onSignInClick,
  error,
  className,
}) => {
  const signInHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

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
      ) : (
        <div className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-start gap-3">
            <Icon.User size={20} weight="duotone" className="mt-0.5 flex-shrink-0 text-secondary" />
            <div>
              <div className="text-title">Sign in to continue</div>
              <div className="caption1 mt-1 text-secondary">
                An account is required to place this order. We&apos;ll send your confirmation and
                receipt to your account email.
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
            {onSignInClick ? (
              <button
                type="button"
                onClick={onSignInClick}
                className="button-main bg-black text-white"
              >
                Sign In
              </button>
            ) : (
              <Link href={signInHref} className="button-main bg-black text-white">
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}

      {error ? <em className="mt-1 block text-sm text-red">{error}</em> : null}
    </CollapsibleSection>
  );
};

export default ContactSection;
