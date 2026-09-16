import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import NewsletterForm from '@/components/Newsletter/NewsletterForm';
import { getDefaultMetadata } from '@/libs/seo';
import { formatNaira, getShippingConfig, getStoreBranding } from '@/libs/storeBranding';
import { siteConfig } from '@/config/siteConfig';

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getStoreBranding();
  return getDefaultMetadata({
    title: 'About Us',
    description: `${storeName} is an online store in ${siteConfig.country} for affordable, quality products.`,
    alternates: { canonical: '/pages/about' },
  });
}

/**
 * Deliberately short and factual: every promise here is backed by something the store does
 * (Paystack checkout, the delivery config, the returns flow, the contact channels in Settings).
 * Add the brand's own story once the owner has written it.
 */
export default async function AboutPage() {
  const [branding, shipping] = await Promise.all([getStoreBranding(), getShippingConfig()]);
  const { storeName, policies, addressLine } = branding;

  const promises = [
    {
      icon: Icon.ShieldCheck,
      title: 'Secure checkout',
      text: 'Pay by card, transfer or USSD through Paystack. We never see or store your card details.',
    },
    {
      icon: Icon.Truck,
      title: `Delivery across ${siteConfig.country}`,
      text: shipping.freeShippingThreshold
        ? `Tracked delivery to your door, free on orders of ${formatNaira(shipping.freeShippingThreshold)} or more.`
        : 'Tracked delivery to your door, with the cost shown before you pay.',
      href: '/pages/shipping',
    },
    {
      icon: Icon.ArrowUUpLeft,
      title: `${policies.returnWindowDays}-day returns`,
      text: `Something not right? Request a return within ${policies.returnWindowDays} days of delivery from your account.`,
      href: '/pages/returns',
    },
    {
      icon: Icon.ChatCircleText,
      title: 'Real people to talk to',
      text: 'Reach us by WhatsApp or email about any order, before or after you buy.',
      href: '/pages/contact',
    },
  ];

  return (
    <>
      <Breadcrumb heading={`About ${storeName}`} subHeading="About Us" />
      <div className="about py-10 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="heading3">Quality products at prices that make sense</h1>
            <p className="body1 mt-5 text-secondary">
              {storeName} is an online store{addressLine ? ` based in ${addressLine}` : ` in ${siteConfig.country}`}.
              We bring together affordable, quality products and deliver them to homes and offices across{' '}
              {siteConfig.country}, with honest prices, secure payment and support when you need it.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {promises.map(({ icon: PromiseIcon, title, text, href }) => (
              <div key={title} className="flex flex-col rounded-2xl border border-line p-6">
                <PromiseIcon size={36} />
                <h2 className="heading6 mt-4">{title}</h2>
                <p className="caption1 mt-2 flex-1 text-secondary">{text}</p>
                {href && (
                  <Link href={href} className="caption1 mt-3 underline">
                    Learn more
                  </Link>
                )}
              </div>
            ))}
          </div>

          <div className="mx-auto mt-16 max-w-2xl rounded-[32px] bg-green px-6 py-10 text-center sm:px-10">
            <h2 className="heading4">Hear about new arrivals and deals first</h2>
            <p className="body1 mt-3 text-secondary">One email when there&apos;s something worth your time. Unsubscribe any time.</p>
            <NewsletterForm source="about" variant="button" className="mx-auto mt-6 max-w-md text-left" />
          </div>
        </div>
      </div>
    </>
  );
}
