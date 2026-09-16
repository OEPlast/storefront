import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import PolicyPage, { type PolicySection } from '@/components/Policy/PolicyPage';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreBranding } from '@/libs/storeBranding';

export async function generateMetadata(): Promise<Metadata> {
  const { policies } = await getStoreBranding();
  return getDefaultMetadata({
    title: 'Returns & Refunds',
    description: `Return eligible items within ${policies.returnWindowDays} days of delivery. How to start a return, what can be returned, and when you get your money back.`,
    alternates: { canonical: '/pages/returns' },
  });
}

export default async function ReturnsPage() {
  const branding = await getStoreBranding();
  const { storeName, policies } = branding;
  const days = policies.returnWindowDays;

  const sections: PolicySection[] = [
    {
      id: 'window',
      title: 'Your return window',
      body: (
        <>
          <p>
            You can ask to return an item within <strong>{days} days of the day it was delivered</strong> (or
            collected, for store pickup). After that, the option to request a return closes on the order.
          </p>
          <p>Your rights under Nigerian consumer protection law are not affected by this policy.</p>
        </>
      ),
    },
    {
      id: 'eligible',
      title: 'What can be returned',
      body: (
        <>
          <p>We accept returns when an item:</p>
          <ul>
            <li>arrived faulty, damaged or not working;</li>
            <li>is not what you ordered (wrong item, size or colour);</li>
            <li>is significantly different from its description or photos;</li>
            <li>is unused and you have changed your mind.</li>
          </ul>
          <p>
            Items must come back with everything they came with (accessories, manuals, tags and packaging). For a
            change-of-mind return the item must be unused and in resaleable condition.
          </p>
          <p>
            We can&apos;t accept change-of-mind returns for items that are used, washed, assembled, personalised, or
            opened where hygiene matters (for example personal care products and underwear).
          </p>
        </>
      ),
    },
    {
      id: 'how',
      title: 'How to start a return',
      body: (
        <>
          <ol className="list-decimal space-y-1.5 pl-5">
            <li>
              Sign in and open the order from <Link href="/my-account?tab=orders">My Account → Orders</Link>.
            </li>
            <li>
              Choose <strong>Request a return</strong>, select the items and quantities, tell us what went wrong and
              add photos if the item is damaged or faulty.
            </li>
            <li>We review the request, usually within 2 business days, and email you our decision.</li>
            <li>If it&apos;s approved, the email tells you where and how to send the items back.</li>
          </ol>
          <p>
            You can follow every request under <Link href="/my-account?tab=returns">My Account → Returns</Link>. Checked
            out as a guest? Contact us with your order number and we&apos;ll start the return for you.
          </p>
        </>
      ),
    },
    {
      id: 'costs',
      title: 'Return delivery costs',
      body: (
        <ul>
          <li>
            <strong>Our mistake</strong> (faulty, damaged, wrong or not as described): we cover the cost of sending it
            back.
          </li>
          <li>
            <strong>Change of mind:</strong> you arrange and pay for the return delivery, and the original delivery fee
            is not refunded.
          </li>
        </ul>
      ),
    },
    {
      id: 'refunds',
      title: 'Refunds',
      body: (
        <>
          <p>
            When the items reach us we inspect them. If they pass, we refund the price of the returned items to{' '}
            <strong>the card or account you paid with</strong>, through our payment provider Paystack. We refund
            within {policies.refundEtaDays} days of the inspection. Your bank may take a few more business days to show
            it.
          </p>
          <p>
            If an item doesn&apos;t pass inspection (for example it&apos;s used or parts are missing on a change-of-mind
            return), we&apos;ll contact you and send it back to you.
          </p>
          <p>We email you at each step: approved, received, inspected and refunded.</p>
        </>
      ),
    },
    {
      id: 'exchanges',
      title: 'Exchanges',
      body: (
        <p>
          Want a different size or colour instead of your money back? Request a return for the item and say so in the
          notes, or contact us. We send a replacement if it&apos;s in stock; if it isn&apos;t, we refund you.
        </p>
      ),
    },
    {
      id: 'cancellations',
      title: 'Cancelling an order',
      body: (
        <>
          <p>
            You can cancel an order from <Link href="/my-account?tab=orders">My Account → Orders</Link> until it has
            been delivered. If you already paid, the cancellation is reviewed by our team and your payment is refunded
            to the original method within {policies.refundEtaDays} days of approval.
          </p>
          <p>If your order is already on its way, it may be quicker to refuse it or return it once it arrives.</p>
        </>
      ),
    },
  ];

  return (
    <PolicyPage
      heading="Returns & Refunds"
      lastUpdated="15 September 2026"
      intro={
        <p>
          We want you to be happy with what you buy from {storeName}. If something isn&apos;t right, here&apos;s how
          returns and refunds work.
        </p>
      }
      sections={sections}
      branding={branding}
    />
  );
}
