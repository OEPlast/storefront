import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/siteConfig';
import { isIndexableDeployment } from '@/config/indexing';

/**
 * Robots policy.
 * - Allow all indexable commerce surfaces (home, product, category, campaign, deals).
 * - Disallow the API. Private/transactional/auth routes and internal search results are
 *   kept out of the index with `noindex` rather than blocked (see below).
 * - Refuse everything on a non-production deployment, so staging and preview copies of the site
 *   never compete with it in search (see config/indexing.ts).
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexableDeployment()) {
    // No sitemap and no host line: nothing here should be discovered or treated as canonical.
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  // Only the API is blocked. Private pages (cart, checkout, account, auth, order tracking) and
  // internal search carry `noindex` instead: a URL disallowed here can't be recrawled, so its
  // `noindex` is never seen and a page indexed earlier stays in results — /cart was showing as a
  // Google sitelink titled "Your cart is empty". See PRIVATE_PAGE_ROBOTS in config/indexing.ts.
  const disallow = ['/api/'];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
