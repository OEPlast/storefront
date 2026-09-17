import type { Metadata } from 'next';
import { PRIVATE_PAGE_ROBOTS } from '@/config/indexing';

/**
 * Every route in this group is per-visitor — cart, checkout, account, auth, order tracking — and
 * must never be indexed. The parentheses make this a route group: the folder is invisible in the
 * URL (`/cart` is still `/cart`), it exists only so these pages share one layout, and that layout
 * has exactly one job: `noindex, nofollow`.
 *
 * Why a group rather than `robots` on each page: several of these pages are client components,
 * which can't export metadata at all, and the rest would each carry a copy of the same rule. One
 * place means one thing to check when a private page turns up in search results — which is how
 * "Your cart is empty" became a Google sitelink.
 *
 * Two things to know before adding a page here:
 *  - Metadata merges leaf-wins per top-level key, so a page in this group must NOT set `robots`
 *    itself, and must not call `getDefaultMetadata()` (it returns `robots: { index: true }` on
 *    production, which would override this layout). Plain `{ title, description }` is enough; the
 *    title template and OG defaults still come from the root layout.
 *  - Being noindex says nothing about caching. These pages inherit the root layout's 12-hour
 *    `revalidate` like everything else; a route that must not be cached at all says so itself
 *    (see `checkout/page.tsx`).
 */
export const metadata: Metadata = { robots: PRIVATE_PAGE_ROBOTS };

export default function NoCrawlLayout({ children }: { children: React.ReactNode }) {
  return children;
}
