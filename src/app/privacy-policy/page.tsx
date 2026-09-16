import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import PolicyPage, { type PolicySection } from '@/components/Policy/PolicyPage';
import { getDefaultMetadata } from '@/libs/seo';
import { getStoreBranding } from '@/libs/storeBranding';

export async function generateMetadata(): Promise<Metadata> {
  return getDefaultMetadata({
    title: 'Privacy Policy',
    description: 'What personal data we collect, why, who we share it with, and your rights under the Nigeria Data Protection Act.',
    keywords: ['privacy policy', 'data protection', 'NDPA'],
    alternates: { canonical: '/privacy-policy' },
    openGraph: {
      title: 'Privacy Policy',
      description: 'Our commitment to protecting your personal information and privacy.',
    },
  });
}

/**
 * Written to match what the platform actually does today: no analytics or advertising trackers,
 * Paystack for payments, GIG Logistics for delivery, Bunny.net for uploaded images. Update this
 * page when any of that changes (for example when analytics is added).
 */
export default async function PrivacyPolicyPage() {
  const branding = await getStoreBranding();
  const { storeName, companyName, addressLine, supportEmail } = branding;

  const sections: PolicySection[] = [
    {
      id: 'who',
      title: 'Who we are',
      body: (
        <p>
          {companyName}
          {addressLine ? `, ${addressLine},` : ''} runs the {storeName} online store and is responsible for your
          personal data (the &ldquo;data controller&rdquo;). We handle it in line with the Nigeria Data Protection Act
          2023.
        </p>
      ),
    },
    {
      id: 'collect',
      title: 'What we collect',
      body: (
        <ul>
          <li>
            <strong>Contact and account details:</strong> your name, email address, phone number, and delivery and
            billing addresses. If you sign in with Google, we receive your name, email and Google account ID.
          </li>
          <li>
            <strong>Orders:</strong> what you bought, prices, delivery method, order and return history, and messages
            or photos you send with a return.
          </li>
          <li>
            <strong>Payments:</strong> Paystack processes your payment. We receive the payment reference, amount and
            status, and may receive the card type and its last four digits. We never receive or store your full card number or PIN.
          </li>
          <li>
            <strong>Reviews</strong> you write, with your name as shown on the review.
          </li>
          <li>
            <strong>Technical data:</strong> your IP address and device/browser information, kept in security logs to
            protect accounts (for example to limit repeated sign-in attempts) and to notify you of password changes.
          </li>
        </ul>
      ),
    },
    {
      id: 'use',
      title: 'How we use it, and why we are allowed to',
      body: (
        <ul>
          <li>
            <strong>To take, deliver and support your orders</strong>, including returns and refunds: needed to perform
            our contract with you.
          </li>
          <li>
            <strong>To send service emails</strong> such as order confirmations, delivery updates, password resets and
            return decisions: needed for the contract and to keep your account secure.
          </li>
          <li>
            <strong>To send marketing emails</strong> about new products and offers: only with your consent, which you
            can withdraw at any time.
          </li>
          <li>
            <strong>To prevent fraud and keep the site secure</strong>: our legitimate interest in protecting you and
            the store.
          </li>
          <li>
            <strong>To keep financial records</strong> required by tax and accounting law: a legal obligation.
          </li>
        </ul>
      ),
    },
    {
      id: 'sharing',
      title: 'Who we share it with',
      body: (
        <>
          <p>We don&apos;t sell your personal data. We share only what each provider needs to do its job for us:</p>
          <ul>
            <li>
              <strong>Paystack</strong>, to process payments and refunds.
            </li>
            <li>
              <strong>GIG Logistics</strong>, to deliver your order (name, phone number and delivery address).
            </li>
            <li>
              <strong>Our email provider</strong>, to send you emails.
            </li>
            <li>
              <strong>Hosting and storage providers</strong> (including Bunny.net for uploaded images), who store data
              on our behalf.
            </li>
            <li>
              <strong>Google</strong>, only if you choose to sign in with Google.
            </li>
            <li>Authorities, where the law requires it.</li>
          </ul>
          <p>
            Some of these providers process data outside Nigeria. Where they do, we rely on the safeguards the Nigeria
            Data Protection Act allows.
          </p>
        </>
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies and local storage',
      body: (
        <p>
          We use only what the site needs to work: a cookie that keeps you signed in, and storage in your browser for
          your cart, wishlist and recent searches. We don&apos;t use advertising or analytics cookies. If you block
          cookies, you won&apos;t be able to sign in or check out.
        </p>
      ),
    },
    {
      id: 'retention',
      title: 'How long we keep it',
      body: (
        <ul>
          <li>
            Account details: while your account is open. When you delete your account, they are removed 7 days later
            (you can cancel until then).
          </li>
          <li>Orders, payments and refunds: as long as tax and accounting law requires (generally six years).</li>
          <li>Security logs: for a short period, then deleted.</li>
          <li>Marketing consent: until you unsubscribe; we keep a record that you opted out so we don&apos;t email you again.</li>
        </ul>
      ),
    },
    {
      id: 'security',
      title: 'Keeping it safe',
      body: (
        <p>
          Passwords are stored as one-way hashes, the site uses encrypted connections (HTTPS), and only staff who need
          your data to do their job can see it, with their actions logged.
        </p>
      ),
    },
    {
      id: 'rights',
      title: 'Your rights',
      body: (
        <>
          <p>You can ask us to:</p>
          <ul>
            <li>give you a copy of the personal data we hold about you;</li>
            <li>correct data that is wrong (you can also edit your details in My Account);</li>
            <li>delete your data, where we don&apos;t need to keep it by law;</li>
            <li>stop or restrict using it, or object to how we use it;</li>
            <li>send your data to you or another organisation in a portable format;</li>
            <li>
              stop marketing emails (use the unsubscribe link in any marketing email, or{' '}
              <Link href="/my-account?tab=setting">My Account → Settings</Link>).
            </li>
          </ul>
          <p>
            You can download a copy of your data or delete your account yourself, in{' '}
            <Link href="/my-account?tab=setting">My Account → Settings → Your data</Link>. For anything else, contact us{supportEmail ? <> at <a href={`mailto:${supportEmail}`}>{supportEmail}</a></> : ''}{' '}
            from the email address on your account. We reply within 30 days. If you&apos;re not satisfied, you can
            complain to the Nigeria Data Protection Commission.
          </p>
        </>
      ),
    },
    {
      id: 'children',
      title: 'Children',
      body: <p>The store is not intended for children under 13, and we don&apos;t knowingly collect their data.</p>,
    },
    {
      id: 'changes',
      title: 'Changes to this policy',
      body: (
        <p>
          We&apos;ll update this page when our practices change, and change the date at the top. If a change is
          significant, we&apos;ll tell you by email or on the site.
        </p>
      ),
    },
  ];

  return <PolicyPage heading="Privacy Policy" lastUpdated="15 September 2026" sections={sections} branding={branding} />;
}
