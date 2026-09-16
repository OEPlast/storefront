import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import ContactChannels, { whatsappUrl } from '@/components/Policy/ContactChannels';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreBranding } from '@/libs/storeBranding';

export async function generateMetadata(): Promise<Metadata> {
  const { storeName } = await getStoreBranding();
  return getDefaultMetadata({
    title: 'Contact Us',
    description: `Get in touch with ${storeName} about an order, a return or a product.`,
    alternates: { canonical: '/pages/contact' },
  });
}

const SELF_SERVICE = [
  { href: '/order-tracking', icon: Icon.Truck, title: 'Track an order', text: 'With your tracking number, or order number and email.' },
  { href: '/pages/returns', icon: Icon.ArrowUUpLeft, title: 'Returns & refunds', text: 'How to send something back and when you get paid.' },
  { href: '/pages/shipping', icon: Icon.Package, title: 'Shipping & delivery', text: 'Delivery areas, times and costs.' },
  { href: '/pages/faqs', icon: Icon.Question, title: 'FAQs', text: 'Quick answers to common questions.' },
];

/**
 * No contact form on purpose: there is no inbox behind one yet, and a form that silently goes
 * nowhere is worse than none. Every channel here comes from Store Settings.
 */
export default async function ContactPage() {
  const branding = await getStoreBranding();
  const { whatsappNumber, supportEmail } = branding;

  return (
    <>
      <Breadcrumb heading="Contact Us" subHeading="Contact Us" />
      <div className="contact-us py-10 md:py-20">
        <div className="container">
          <div className="flex justify-between gap-y-10 max-lg:flex-col">
            <div className="lg:w-7/12 lg:pr-4">
              <h1 className="heading3">We&apos;re here to help</h1>
              <p className="body1 mt-3 text-secondary">
                Questions about an order, a return or a product? Message us and include your order number if you have
                one, so we can help faster.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {whatsappNumber && (
                  <a href={whatsappUrl(whatsappNumber)} target="_blank" rel="noopener noreferrer" className="button-main inline-flex items-center gap-2">
                    <Icon.WhatsappLogo size={20} weight="fill" /> Chat on WhatsApp
                  </a>
                )}
                {supportEmail && (
                  <a
                    href={`mailto:${supportEmail}`}
                    className="button-main inline-flex items-center gap-2 border border-black bg-white text-black hover:bg-black hover:text-white"
                  >
                    <Icon.EnvelopeSimple size={20} /> Send an email
                  </a>
                )}
              </div>

              <h2 className="heading5 mt-12">Sort it yourself</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {SELF_SERVICE.map(({ href, icon: ItemIcon, title, text }) => (
                  <Link key={href} href={href} className="flex gap-3 rounded-2xl border border-line p-5 duration-300 hover:border-black">
                    <ItemIcon size={28} className="shrink-0" />
                    <div>
                      <div className="text-title">{title}</div>
                      <p className="caption1 mt-1 text-secondary">{text}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="lg:w-4/12 lg:pl-4">
              <div className="rounded-2xl bg-surface p-6">
                <h2 className="heading5">Contact details</h2>
                <ContactChannels branding={branding} className="mt-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
