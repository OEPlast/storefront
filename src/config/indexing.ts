/**
 * Whether *this deployment* may be indexed at all.
 *
 * Separate from `libs/indexation.ts`, which decides whether a particular URL (facets, pagination)
 * should be indexed. This one is about the environment: a staging or preview copy serves the same
 * pages as production, so without this it competes with the real site for the same queries and
 * splits its ranking signals.
 *
 * Rules:
 *   - On Vercel, `VERCEL_ENV` says it directly: only `production` may be indexed. Preview
 *     deployments are never indexable, whatever they are aliased to.
 *   - Anywhere else (self-hosted, another platform, local), indexing is opt-in: set
 *     `ALLOW_INDEXING=true` on the production environment only.
 *
 * The default is "not indexable", so a new environment is safe until someone says otherwise. The
 * cost of that choice is that a self-hosted production deployment stays out of search until the
 * flag is set — which §1 of SEO-LAUNCH-RUNBOOK.md tells you to check.
 *
 * Note this does NOT cover the production deployment being reachable on its `*.vercel.app` alias:
 * that host is production, so it is indexable by this rule. `next.config.js` redirects it to the
 * canonical host instead.
 *
 * Since pages are now cached (12h ISR), this is read when a page is *generated*, not on every
 * request, and the answer is baked into the cached HTML. On Vercel that changes nothing —
 * `VERCEL_ENV` is set at build time and at runtime. Off Vercel, `ALLOW_INDEXING` must be present in
 * the *build* environment as well as the runtime one, or the built pages carry `noindex` no matter
 * what the server is later started with.
 */
export const isIndexableDeployment = (): boolean =>
  process.env.VERCEL_ENV
    ? process.env.VERCEL_ENV === 'production'
    : process.env.ALLOW_INDEXING === 'true';

/**
 * Robots for pages that differ per visitor (cart, checkout, account, auth, order tracking). They are
 * `noindex` rather than blocked in robots.txt: a URL blocked there can't be recrawled, so a crawler
 * never sees the `noindex`, and a page indexed before the block stays in results indefinitely —
 * which is how "Your cart is empty" became a Google sitelink.
 */
export const PRIVATE_PAGE_ROBOTS = { index: false, follow: false } as const;
