import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import PolicyPage, { type PolicySection } from '@/components/Policy/PolicyPage';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreBranding } from '@/libs/storeBranding';
import { siteConfig } from '@/config/siteConfig';

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getStoreBranding();
  return getDefaultMetadata({
    title: 'Terms of Use',
    description: `The terms that apply when you use the ${storeName} website and buy from us.`,
    alternates: { canonical: '/pages/terms' },
  });
}

export default async function TermsPage() {
  const branding = await getStoreBranding();
  const { storeName, companyName, addressLine, policies } = branding;
  const operator = companyName !== storeName ? `${companyName} (trading as ${storeName})` : storeName;

  const sections: PolicySection[] = [
    {
      id: 'about',
      title: 'About these terms',
      body: (
        <>
          <p>
            This website is operated by {operator}
            {addressLine ? `, ${addressLine}` : ''} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). These terms apply when you
            browse the site, create an account or place an order. By using the site you agree to them.
          </p>
          <p>
            We may update these terms from time to time. The version on this page when you place an order is the one
            that applies to that order.
          </p>
        </>
      ),
    },
    {
      id: 'account',
      title: 'Your account',
      body: (
        <ul>
          <li>You must be at least 18, or use the site with the permission of a parent or guardian.</li>
          <li>Give accurate details and keep your password private. You are responsible for activity on your account.</li>
          <li>Tell us straight away if you think someone else has used your account.</li>
          <li>We may suspend an account that is used for fraud, abuse or in breach of these terms.</li>
        </ul>
      ),
    },
    {
      id: 'orders',
      title: 'Orders and contract',
      body: (
        <>
          <p>
            When you place an order you make an offer to buy. We accept it when we confirm payment and send you an order
            confirmation email. We may decline or cancel an order (for example if an item is out of stock, a price was
            clearly wrong, or we suspect fraud); if you already paid, we refund you in full.
          </p>
          <p>Product photos are for illustration. Colours and sizes can vary slightly from what you see on screen.</p>
        </>
      ),
    },
    {
      id: 'prices',
      title: 'Prices and payment',
      body: (
        <>
          <p>
            Prices are in Nigerian Naira ({siteConfig.currencySymbol}) and include any applicable VAT unless stated
            otherwise. Delivery fees are shown at checkout before you pay.
          </p>
          <p>
            Payments are processed securely by Paystack. We don&apos;t see or store your full card details. An order
            that isn&apos;t paid within the time shown at checkout is cancelled automatically.
          </p>
          <p>
            Discount codes and promotions have their own conditions (such as minimum spend, expiry date or one use per
            customer), are not exchangeable for cash, and can&apos;t be applied after an order is placed.
          </p>
        </>
      ),
    },
    {
      id: 'delivery',
      title: 'Delivery',
      body: (
        <p>
          Delivery times are estimates, not guarantees. Risk in the goods passes to you when they are delivered to you
          or collected. See <Link href="/pages/shipping">Shipping &amp; Delivery</Link> for details.
        </p>
      ),
    },
    {
      id: 'returns',
      title: 'Returns, cancellations and refunds',
      body: (
        <p>
          You can request a return within {policies.returnWindowDays} days of delivery, and cancel an order until it is
          delivered, as set out in our <Link href="/pages/returns">Returns &amp; Refunds policy</Link>. Nothing in these
          terms limits your rights under the Federal Competition and Consumer Protection Act 2018 or other Nigerian
          consumer law.
        </p>
      ),
    },
    {
      id: 'reviews',
      title: 'Reviews and content you post',
      body: (
        <p>
          Reviews must be honest, about your own experience, and free of offensive, unlawful or promotional content. By
          posting you let us display the review on the site. We may remove content that breaks these rules.
        </p>
      ),
    },
    {
      id: 'use',
      title: 'Using the site',
      body: (
        <>
          <p>
            Don&apos;t misuse the site: no attempts to break its security, scrape it at scale, interfere with other
            customers, or use it for anything unlawful.
          </p>
          <p>
            The site&apos;s content, logos and design belong to us or our licensors and may not be copied for commercial
            use without permission.
          </p>
        </>
      ),
    },
    {
      id: 'liability',
      title: 'Our responsibility to you',
      body: (
        <p>
          We are responsible for loss or damage you suffer that is a foreseeable result of us breaking these terms or
          failing to use reasonable care. We are not responsible for loss that isn&apos;t foreseeable, for business
          losses, or for delays caused by events outside our reasonable control. Nothing here limits liability that
          cannot be limited by law.
        </p>
      ),
    },
    {
      id: 'privacy',
      title: 'Your privacy',
      body: (
        <p>
          How we use your personal data is explained in our <Link href="/privacy-policy">Privacy Policy</Link>.
        </p>
      ),
    },
    {
      id: 'law',
      title: 'Governing law and disputes',
      body: (
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria. If something goes wrong, please
          contact us first so we can try to put it right. If we can&apos;t resolve it, the Nigerian courts have
          jurisdiction.
        </p>
      ),
    },
  ];

  return (
    <PolicyPage heading="Terms of Use" lastUpdated="15 September 2026" sections={sections} branding={branding} />
  );
}
