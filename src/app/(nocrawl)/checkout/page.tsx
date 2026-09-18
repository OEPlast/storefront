import type { Metadata } from 'next';
import CheckoutClient from './CheckoutClient';

// Robots come from the (nocrawl) group layout; only the title belongs here.
export const metadata: Metadata = { title: 'Checkout' };

/**
 * Never prerendered. Checkout is entirely per-visitor — cart, addresses, coupons, the payment
 * session — so there is nothing worth caching, and the client bundle touches `window` at module
 * scope, which a static export can't run. Everything else on the site inherits the root layout's
 * 12-hour `revalidate`; this route opts out of it.
 */
export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return <CheckoutClient />;
}
