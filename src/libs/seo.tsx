import type { Metadata } from "next";
import { siteConfig } from "@/config/siteConfig";
import { getStoreName } from "@/libs/storeBranding";
import { isIndexableDeployment } from "@/config/indexing";

export async function getDefaultMetadata(overrides?: Partial<Metadata>): Promise<Metadata> {
  const storeName = await getStoreName();
  const defaultTitle = `${storeName} - Affordable Quality Products`;
  const description = `${storeName} Online Store - Your One-Stop Shop for Affordable Quality Products`;

  // Staging and preview deployments carry noindex on every page, as a second line of defence
  // behind robots.txt: a URL that was linked to directly is crawled even when robots.txt
  // disallows it, and only the meta tag keeps it out of the index.
  const indexable = isIndexableDeployment();

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
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        }
      : { index: false, follow: false, googleBot: { index: false, follow: false } },
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

  // Shallow-merge top-level keys, but deep-merge openGraph/twitter so a page that
  // overrides e.g. openGraph.title keeps the default images, siteName and locale.
  return {
    ...metadata,
    ...(overrides || {}),
    openGraph: { ...metadata.openGraph, ...overrides?.openGraph },
    twitter: { ...metadata.twitter, ...overrides?.twitter },
    // Applied after the overrides: a page may narrow indexing (noindex a thin page), but it can
    // never opt a staging deployment back in.
    ...(indexable ? {} : { robots: metadata.robots }),
  } as Metadata;
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
