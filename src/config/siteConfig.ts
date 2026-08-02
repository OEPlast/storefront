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

  // ── Contact / brand entity (E-E-A-T + Organization schema) ─────────────────
  contact: {
    email: 'Rawura@gmail.com',
    phone: '+2348028299167',
    address: {
      street: 'No 1, Abule Ojo Busstop',
      city: 'Lagos',
      region: 'Lagos',
      postalCode: '',
      country: 'Nigeria',
      countryCode: 'NG',
    },
  },

  // ── Social profiles → schema.org `sameAs` (fill in real, active profiles) ──
  social: {
    twitter: 'https://twitter.com/rawura',
    facebook: 'https://facebook.com/rawura',
    instagram: 'https://instagram.com/rawura',
  },

  // ── Store policies (surfaced in Product schema + Merchant Center feed) ──────
  policy: {
    freeShipping: true,
    // Delivery estimate window (business days) across Nigeria — used by shippingDetails.
    deliveryDaysMin: 1,
    deliveryDaysMax: 7,
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

/** Social profile URLs as a flat `sameAs` array (empty entries filtered out). */
export function getSameAs(): string[] {
  return Object.values(siteConfig.social).filter(Boolean);
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
