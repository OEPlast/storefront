import type { Metadata } from "next";
import { siteConfig } from "@/config/siteConfig";

export function getDefaultMetadata(overrides?: Partial<Metadata>): Metadata {
  const metadata: Metadata = {
    title: {
      default: siteConfig.defaultTitle,
      template: siteConfig.titleTemplate,
    },
    description: siteConfig.description,
    applicationName: siteConfig.name,
    keywords: siteConfig.keywords,
    openGraph: {
      title: siteConfig.defaultTitle,
      description: siteConfig.description,
      url: siteConfig.url,
      siteName: siteConfig.name,
      images: [
        {
          url: siteConfig.ogImage,
          alt: siteConfig.name,
        },
      ],
      locale: siteConfig.locale,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteConfig.defaultTitle,
      description: siteConfig.description,
      creator: siteConfig.twitter,
      images: [siteConfig.ogImage],
    },
    metadataBase: new URL(siteConfig.url),
  };

  return { ...metadata, ...(overrides || {}) } as Metadata;
}

export default getDefaultMetadata;
