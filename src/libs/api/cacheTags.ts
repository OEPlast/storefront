/**
 * Cache tags — the shared vocabulary between this storefront's Next.js Data Cache and
 * Main-server, which purges entries by calling `POST /api/revalidate` after a write.
 *
 * A tag is attached to a `fetch` (see `cachedApi.ts`); calling `revalidateTag(tag)` drops every
 * cached response carrying it, and any page whose render read one of those responses. So the tag
 * set is really a blast-radius decision:
 *
 *   - `PRODUCTS` is on every *list* of products (home rails, deals, category/campaign listings).
 *     Purging it regenerates a lot of pages, so Main-server only sends it when a list would
 *     actually change — a product created, deleted, renamed, repriced, or crossing in/out of
 *     stock — never on every order.
 *   - `product(slug)` is on the single product's detail fetch, and deliberately NOT tagged
 *     `PRODUCTS`: a stock decrement purges one page, not the whole catalogue.
 *   - `BRANDING`, `DELIVERY_CONFIG`, `CATEGORIES` and `BANNERS` are read by the root layout, so
 *     purging one of them regenerates every page. They are edited rarely, which is what makes
 *     that acceptable.
 *
 * Keep this list in sync with the allowlist in `app/api/revalidate/route.ts` and with
 * `Main-server/src/services/storefront/revalidate.ts`.
 */

/** Tags with no argument. */
export const CacheTag = {
  /** Any product list: home rails, deals, category/campaign/new/top-sold listings. */
  PRODUCTS: 'products',
  /** The category tree in the header menu. */
  CATEGORIES: 'categories',
  /** Campaign list + campaign metadata. */
  CAMPAIGNS: 'campaigns',
  /** Home/category banner slider. */
  BANNERS: 'banners',
  /** Intent-shop list (`/shop/<slug>` landing pages). */
  INTENTS: 'intents',
  /** Store Settings: name, contact details, policies, social links. Read by the layout. */
  BRANDING: 'branding',
  /** Checkout delivery settings: free-shipping threshold, delivery window. Read by the layout. */
  DELIVERY_CONFIG: 'delivery-config',
} as const;

export type CacheTagValue = (typeof CacheTag)[keyof typeof CacheTag];

/** A single product's detail page and its slug-redirect lookup. */
export const productTag = (slug: string) => `product:${slug}`;
/** One category's own data (info + its product listing). */
export const categoryTag = (slug: string) => `category:${slug}`;
/** One campaign's own data (info + its product listing). */
export const campaignTag = (slug: string) => `campaign:${slug}`;
/** One intent shop's own data. */
export const intentTag = (slug: string) => `intent:${slug}`;

/**
 * How long a cached response is served before Next re-fetches it in the background.
 * 12 hours (owner decision): a page nobody has visited for a day is refreshed on its next visit,
 * and anything that actually changed arrives sooner via the on-demand purge above.
 *
 * Next requires `export const revalidate` to be a literal, so pages write `43200` directly and
 * this constant is only for `fetch` options.
 */
export const DEFAULT_REVALIDATE = 43200;
