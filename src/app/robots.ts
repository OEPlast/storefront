import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/siteConfig';

/**
 * Robots policy.
 * - Allow all indexable commerce surfaces (home, product, category, campaign, deals, blog).
 * - Disallow private/transactional/auth routes and API.
 * - Disallow internal search results (thin/duplicate) — high-demand queries get
 *   dedicated indexable landing pages instead (see /shop programmatic pages).
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    '/api/',
    '/my-account/',
    '/my-account',
    '/checkout/',
    '/checkout',
    '/checkout2/',
    '/checkout2',
    '/cart',
    '/wishlist',
    '/compare',
    '/login',
    '/register',
    '/forgot-password',
    '/verify-otp',
    '/order-tracking',
    '/search-result', // internal search results — not indexable
  ];

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
