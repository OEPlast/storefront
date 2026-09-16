const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://www.rawura.com';

export const siteConfig = {
  name: 'Rawura',
  titleTemplate: '%s | Rawura',
  defaultTitle: 'Rawura - Affordable Quality Products',
  description: 'Rawura Online Store - Your One-Stop Shop for Affordable Quality Products',
  url: MAIN_SITE_URL,
  ogImage: '/images/brand/ogimage.png',
  logo: {
    light: '/images/brand/logoLight.png',
    dark: '/images/brand/logoDark.png',
    transparent: '/images/brand/logoTransparent.png',
    miniLight: '/images/brand/logoMiniLight.png',
    miniDark: '/images/brand/logoMiniDark.png',
  },
  twitter: '@rawura',
  locale: 'en_NG',
  author: 'Rawura',
  keywords: ['ecommerce', 'online store', 'Rawura', 'shop', 'affordable products'],

  // ── Commerce / geo signals (Nigeria now, expansion-safe) ───────────────────
  // areaServed is data (not a constant) so it can grow to a country list later.
  currency: 'NGN',
  currencySymbol: '₦',
  country: 'Nigeria',
  countryCode: 'NG',
  areaServed: ['Nigeria'] as string[],

  // Contact details, social links and delivery terms are NOT here: they live in Store Settings
  // (libs/storeBranding.ts) and the checkout delivery config, so the admin can change them.

  // ── Store policies (surfaced in Product schema) ─────────────────────────────
  policy: {
    /** Must match Main-server config/storePolicies.ts RETURN_WINDOW_DAYS. */
    returnDays: 7,
  },
};

export type SiteConfig = typeof siteConfig;

/** Absolute URL helper — joins a path onto the canonical site origin. */
export function absoluteUrl(path = ''): string {
  if (!path) return siteConfig.url;
  if (path.startsWith('http')) return path;
  return `${siteConfig.url}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function prefetchImages(imageUrls: string[]) {
  if (imageUrls.length === 0) return;

  try {
    await Promise.all(
      imageUrls.slice(0, 3).map(
        (
          url // Only prefetch first 3 images
        ) => fetch(url, { method: 'HEAD' }).catch(() => null)
      )
    );
  } catch (error) {
    console.error('Image prefetch error:', error);
  }
}
