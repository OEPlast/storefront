import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import PolicyPage, { type PolicySection } from '@/components/Policy/PolicyPage';
import { getDefaultMetadata } from '@/libs/seo';
import { formatNaira, getShippingConfig, getStoreBranding } from '@/libs/storeBranding';
import { siteConfig } from '@/config/siteConfig';

export async function generateMetadata(): Promise<Metadata> {
  return getDefaultMetadata({
    title: 'Shipping & Delivery',
    description: `Where we deliver in ${siteConfig.country}, how long it takes, what it costs and how to track your order.`,
    alternates: { canonical: '/pages/shipping' },
  });
}

export default async function ShippingPage() {
  const [branding, shipping] = await Promise.all([getStoreBranding(), getShippingConfig()]);
  const { freeShippingThreshold, deliveryWindowLabel, pickupEnabled, deliveryEnabled } = shipping;

  const sections: PolicySection[] = [
    {
      id: 'options',
      title: 'Delivery options',
      body: (
        <ul>
          {deliveryEnabled && (
            <li>
              <strong>Home or office delivery</strong> anywhere in {siteConfig.country}, by our courier partner GIG
              Logistics.
            </li>
          )}
          {pickupEnabled && (
            <li>
              <strong>Store pickup</strong>
              {branding.addressLine ? ` from ${branding.addressLine}` : ''}. Choose it at checkout; we&apos;ll contact you when
              your order is ready to collect. Bring your order number.
            </li>
          )}
        </ul>
      ),
    },
    {
      id: 'times',
      title: 'Delivery times',
      body: (
        <>
          <p>
            We pack and hand over paid orders to the courier within 1–2 business days.
            {deliveryWindowLabel && (
              <>
                {' '}
                Delivery then usually takes <strong>{deliveryWindowLabel}</strong>, depending on your location.
              </>
            )}
          </p>
          <p>
            Business days are Monday to Friday, excluding public holidays. Remote areas, bad weather or courier
            delays can add time; we&apos;ll keep you updated by email if that happens.
          </p>
        </>
      ),
    },
    {
      id: 'costs',
      title: 'Delivery costs',
      body: (
        <>
          <p>
            The delivery fee is calculated at checkout from your delivery address and the size and weight of your
            order. You see the exact amount before you pay.
          </p>
          {freeShippingThreshold && (
            <p>
              <strong>Delivery is free on orders of {formatNaira(freeShippingThreshold)} or more.</strong>
            </p>
          )}
          {pickupEnabled && <p>Store pickup is free.</p>}
        </>
      ),
    },
    {
      id: 'tracking',
      title: 'Tracking your order',
      body: (
        <p>
          When your order ships, we email you a tracking number. Track it any time on the{' '}
          <Link href="/order-tracking">order tracking page</Link> with that number, or with your order number and email
          address. Signed-in customers can also follow every order in{' '}
          <Link href="/my-account?tab=orders">My Account</Link>.
        </p>
      ),
    },
    {
      id: 'receiving',
      title: 'Receiving your parcel',
      body: (
        <>
          <p>
            Please make sure the phone number on your order is reachable: the courier calls before delivery. If they
            can&apos;t reach you or no one is available, they&apos;ll try again or contact you to arrange another time.
          </p>
          <p>
            Check your parcel when it arrives. If it&apos;s damaged, opened, or something is missing or wrong, tell us
            within {branding.policies.returnWindowDays} days of delivery and see our{' '}
            <Link href="/pages/returns">returns and refunds policy</Link>.
          </p>
        </>
      ),
    },
    {
      id: 'address',
      title: 'Changing your delivery address',
      body: (
        <p>
          Contact us as soon as possible. We can change the address until the order has been handed to the courier; a
          change to a different area may change the delivery fee.
        </p>
      ),
    },
  ];

  return (
    <PolicyPage
      heading="Shipping & Delivery"
      lastUpdated="15 September 2026"
      intro={<p>Everything you need to know about getting your order to you.</p>}
      sections={sections}
      branding={branding}
    />
  );
}
