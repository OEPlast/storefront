const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL || 'https://www.rawura.com';

export const siteConfig = {
  name: 'Rawura',
  titleTemplate: '%s | Rawura',
  defaultTitle: 'Rawura - Affordable Quality Products',
  description: 'Rawura Online Store - Your One-Stop Shop for Affordable Quality Products',
  url: MAIN_SITE_URL,
  ogImage: `${MAIN_SITE_URL}/images/brand/ogimage.png`,
  logo: {
    light: `${MAIN_SITE_URL}/images/brand/logoLight.png`,
    dark: `${MAIN_SITE_URL}/images/brand/logoDark.png`,
    transparent: `${MAIN_SITE_URL}/images/brand/logoTransparent.png`,
    miniLight: `${MAIN_SITE_URL}/images/brand/logoMiniLight.png`,
    miniDark: `${MAIN_SITE_URL}/images/brand/logoMiniDark.png`,
  },
  twitter: '@rawura',
  locale: 'en_NG',
  author: 'Rawura',
  keywords: ['ecommerce', 'online store', 'Rawura', 'shop', 'affordable products'],
};

export type SiteConfig = typeof siteConfig;

// Helper function to prefetch images
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
