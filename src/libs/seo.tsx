import type { Metadata } from "next";
import { siteConfig } from "@/config/siteConfig";
import { getStoreName } from "@/libs/storeBranding";

export async function getDefaultMetadata(overrides?: Partial<Metadata>): Promise<Metadata> {
  const storeName = await getStoreName();
  const defaultTitle = `${storeName} - Affordable Quality Products`;
  const description = `${storeName} Online Store - Your One-Stop Shop for Affordable Quality Products`;

  const metadata: Metadata = {
    title: {
      default: defaultTitle,
      template: `%s | ${storeName}`,
    },
    description,
    applicationName: storeName,
    keywords: siteConfig.keywords,
    authors: [{ name: storeName }],
    creator: storeName,
    publisher: storeName,
    openGraph: {
      title: defaultTitle,
      description,
      url: siteConfig.url,
      siteName: storeName,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: storeName,
        },
      ],
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
      creator: siteConfig.twitter,
      images: [siteConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon.ico',
      apple: siteConfig.logo.transparent,
    },
    metadataBase: new URL(siteConfig.url),
    other: {
      'og:logo': siteConfig.logo.transparent,
    },
  };

  return { ...metadata, ...(overrides || {}) } as Metadata;
}

/**
 * Component to prefetch critical brand images
 * Add this to your root layout for better performance
 */
export function PrefetchImages() {
  return (
    <>
      <link rel="prefetch" href={siteConfig.ogImage} as="image" />
      <link rel="prefetch" href={siteConfig.logo.transparent} as="image" />
      <link rel="prefetch" href={siteConfig.logo.light} as="image" />
      <link rel="prefetch" href={siteConfig.logo.dark} as="image" />
      <link rel="preload" href={siteConfig.logo.transparent} as="image" />
    </>
  );
}

export default getDefaultMetadata;
