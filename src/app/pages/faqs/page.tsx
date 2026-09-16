import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import * as Icon from '@phosphor-icons/react/dist/ssr';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import ContactChannels from '@/components/Policy/ContactChannels';
import { getDefaultMetadata } from '@/libs/seo';
import { formatNaira, getShippingConfig, getStoreBranding } from '@/libs/storeBranding';
import { generateFAQSchema, injectStructuredData } from '@/libs/structured-data';
import { siteConfig } from '@/config/siteConfig';

export async function generateMetadata(): Promise<Metadata> {
  return getDefaultMetadata({
    title: 'FAQs',
    description: 'Answers about ordering, payment, delivery, returns and your account.',
    alternates: { canonical: '/pages/faqs' },
  });
}

interface Faq {
  question: string;
  /** Plain text: it's also published as FAQPage structured data. */
  answer: string;
  link?: { href: string; label: string };
}

export default async function FaqsPage() {
  const [branding, shipping] = await Promise.all([getStoreBranding(), getShippingConfig()]);
  const { policies } = branding;

  const groups: { title: string; faqs: Faq[] }[] = [
    {
      title: 'Orders & payment',
      faqs: [
        {
          question: 'How do I pay?',
          answer:
            'Payments are processed securely by Paystack. You can pay with a debit or credit card (Visa, Mastercard, Verve), bank transfer or USSD, depending on what Paystack offers for your bank. We never see your full card details.',
        },
        {
          question: 'Do I need an account to order?',
          answer:
            'No, you can check out as a guest. An account lets you see all your orders in one place, request returns online and save your addresses.',
        },
        {
          question: 'I paid but my order shows as unpaid or cancelled. What happens?',
          answer:
            'Sometimes a bank transfer confirms after the payment window closes. If money reaches us for an order that was already cancelled, it is refunded automatically to where it came from. Contact us with your order number if you have not received it.',
        },
        {
          question: 'Can I cancel my order?',
          answer: `Yes, from My Account → Orders, until the order is delivered. If you already paid, our team reviews the cancellation and the refund reaches your original payment method within ${policies.refundEtaDays} days of approval.`,
          link: { href: '/pages/returns#cancellations', label: 'Cancellation policy' },
        },
        {
          question: 'How do I use a discount code?',
          answer:
            'Enter the code at checkout before you pay. Each code has its own conditions, such as a minimum order amount, an expiry date, or one use per customer; the checkout tells you if a code does not apply.',
        },
      ],
    },
    {
      title: 'Delivery',
      faqs: [
        {
          question: 'Where do you deliver?',
          answer: [
            shipping.deliveryEnabled && `We deliver anywhere in ${siteConfig.country} with GIG Logistics.`,
            shipping.pickupEnabled && 'You can also choose free store pickup at checkout.',
          ]
            .filter(Boolean)
            .join(' '),
          link: { href: '/pages/shipping', label: 'Shipping & delivery' },
        },
        {
          question: 'How long does delivery take?',
          answer: shipping.deliveryWindowLabel
            ? `We hand paid orders to the courier within 1–2 business days, and delivery usually takes ${shipping.deliveryWindowLabel} after that, depending on your location.`
            : 'We hand paid orders to the courier within 1–2 business days. Your delivery estimate is shown at checkout.',
        },
        {
          question: 'How much is delivery?',
          answer: `The fee is calculated at checkout from your address and the weight of your order, before you pay.${
            shipping.freeShippingThreshold
              ? ` Delivery is free on orders of ${formatNaira(shipping.freeShippingThreshold)} or more.`
              : ''
          }`,
        },
        {
          question: 'How do I track my order?',
          answer:
            'We email you a tracking number when your order ships. Enter it, or your order number and email address, on the order tracking page.',
          link: { href: '/order-tracking', label: 'Track an order' },
        },
      ],
    },
    {
      title: 'Returns & refunds',
      faqs: [
        {
          question: 'What is your return policy?',
          answer: `You can request a return within ${policies.returnWindowDays} days of delivery. Faulty, damaged or wrong items come back at our cost; change-of-mind returns must be unused, and you pay the return delivery.`,
          link: { href: '/pages/returns', label: 'Returns & refunds policy' },
        },
        {
          question: 'How do I return something?',
          answer:
            'Sign in, open the order in My Account → Orders and choose "Request a return". Select the items, tell us what went wrong and add photos if it is damaged. We email you once it is reviewed. Guest orders: contact us with your order number.',
        },
        {
          question: 'When will I get my refund?',
          answer: `Once the items reach us and pass inspection, we refund the card or account you paid with within ${policies.refundEtaDays} days. Your bank may take a few more business days to show it.`,
        },
      ],
    },
    {
      title: 'Your account',
      faqs: [
        {
          question: 'I forgot my password.',
          answer:
            'Choose "Forgot your password?" on the sign-in form. We email you a code to set a new password; the code expires after a few minutes, so use it straight away.',
          link: { href: '/forgot-password', label: 'Reset password' },
        },
        {
          question: 'How do I stop marketing emails?',
          answer:
            'Use the unsubscribe link at the bottom of any marketing email, or turn off marketing emails in My Account → Settings. You will still receive emails about your orders.',
        },
        {
          question: 'Can I delete my account or get a copy of my data?',
          answer:
            'Yes, from My Account → Settings → Your data. "Download" gives you a copy of your personal data. "Delete my account" removes your name, email, phone number and addresses after a 7-day grace period, during which you can cancel. Records of past orders and payments are kept for tax purposes but no longer identify you.',
          link: { href: '/privacy-policy#rights', label: 'Your privacy rights' },
        },
      ],
    },
  ];

  const allFaqs = groups.flatMap((group) => group.faqs).filter((faq) => faq.answer);

  return (
    <>
      {injectStructuredData(generateFAQSchema(allFaqs), 'ld-faq')}
      <Breadcrumb heading="Frequently Asked Questions" subHeading="FAQs" />
      <div className="faqs-page py-10 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            {groups.map((group) => (
              <section key={group.title} className="mt-10 first:mt-0">
                <h2 className="heading5">{group.title}</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {group.faqs
                    .filter((faq) => faq.answer)
                    .map((faq) => (
                      <details key={faq.question} className="group rounded-2xl border border-line px-5 py-4 md:px-6">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                          <span className="heading6">{faq.question}</span>
                          <Icon.CaretDown size={20} className="shrink-0 duration-300 group-open:rotate-180" />
                        </summary>
                        <p className="body1 mt-3 text-secondary">{faq.answer}</p>
                        {faq.link && (
                          <Link href={faq.link.href} className="caption1 mt-2 inline-block underline">
                            {faq.link.label}
                          </Link>
                        )}
                      </details>
                    ))}
                </div>
              </section>
            ))}

            <div className="mt-14 rounded-2xl bg-surface p-6">
              <h2 className="heading6">Didn&apos;t find your answer?</h2>
              <ContactChannels branding={branding} className="mt-4" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
