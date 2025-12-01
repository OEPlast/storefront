import type { Product, Organization, BreadcrumbList, WithContext } from "schema-dts";
import { siteConfig } from "@/config/siteConfig";

export function generateProductSchema(product: {
  name: string;
  description?: string;
  price: number;
  stock: number;
  images?: string[];
  brand?: string;
  category?: string;
  slug: string;
  sku?: string;
}): WithContext<Product> {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || `${product.name} - Available at ${siteConfig.name}`,
    image: product.images || [],
    brand: {
      "@type": "Brand",
      name: product.brand || siteConfig.name,
    },
    sku: product.sku,
    offers: {
      "@type": "Offer",
      url: `${siteConfig.url}/product/${product.slug}`,
      priceCurrency: "NGN",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: siteConfig.name,
      },
    },
    ...(product.category && {
      category: product.category,
    }),
  };
}

export function generateOrganizationSchema(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    sameAs: [
      // Add your social media URLs here
      `https://twitter.com/${siteConfig.twitter}`,
    ],
  };
}

export function generateBreadcrumbSchema(items: Array<{
  name: string;
  url: string;
}>): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${siteConfig.url}${item.url}`,
    })),
  };
}

export function injectStructuredData(schema: WithContext<any>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
