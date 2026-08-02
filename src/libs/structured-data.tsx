import type {
  Product,
  Organization,
  BreadcrumbList,
  ItemList,
  CollectionPage,
  WebSite,
  FAQPage,
  WithContext,
} from 'schema-dts';
import { siteConfig, getSameAs, absoluteUrl } from '@/config/siteConfig';

// ─────────────────────────────────────────────────────────────────────────────
// JSON-LD injection
// Deterministic id (no Math.random → no hydration mismatch) rendered as a plain
// <script type="application/ld+json"> so the markup is in the static server HTML.
// ─────────────────────────────────────────────────────────────────────────────

function stableId(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return `ld-${Math.abs(hash).toString(36)}`;
}

export function injectStructuredData(schema: WithContext<any>, id?: string) {
  const json = JSON.stringify(schema);
  return (
    <script
      id={id || stableId(json)}
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

const CURRENCY = siteConfig.currency; // 'NGN'

/** YYYY-MM-DD, N days from now — used for priceValidUntil. */
function dateFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function availabilityUrl(inStock: boolean): string {
  return inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
}

/** Free nationwide shipping block (matches Merchant Center feed + store policy). */
function shippingDetails() {
  return {
    '@type': 'OfferShippingDetails' as const,
    shippingRate: {
      '@type': 'MonetaryAmount' as const,
      value: 0,
      currency: CURRENCY,
    },
    shippingDestination: {
      '@type': 'DefinedRegion' as const,
      addressCountry: siteConfig.countryCode,
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime' as const,
      handlingTime: {
        '@type': 'QuantitativeValue' as const,
        minValue: 0,
        maxValue: 1,
        unitCode: 'DAY',
      },
      transitTime: {
        '@type': 'QuantitativeValue' as const,
        minValue: siteConfig.policy.deliveryDaysMin,
        maxValue: siteConfig.policy.deliveryDaysMax,
        unitCode: 'DAY',
      },
    },
  };
}

/** N-day return policy block (matches store policy). */
function merchantReturnPolicy() {
  return {
    '@type': 'MerchantReturnPolicy' as const,
    applicableCountry: siteConfig.countryCode,
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: siteConfig.policy.returnDays,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/FreeReturn',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Product
// ─────────────────────────────────────────────────────────────────────────────

export interface ProductSchemaInput {
  name: string;
  description?: string;
  /** Final/display price the customer pays. */
  price: number;
  /** Original price before discount (for reference only). */
  originalPrice?: number;
  stock: number;
  images?: string[];
  brand?: string;
  category?: string;
  slug: string;
  sku?: string;
  gtin?: string;
  mpn?: string;
  condition?: 'new' | 'used' | 'refurbished';
  ratingValue?: number;
  reviewCount?: number;
  priceValidUntil?: string;
  reviews?: Array<{ author: string; rating: number; body?: string; date?: string }>;
  /** Variant price points → emits AggregateOffer when there is a range. */
  variantPrices?: number[];
}

const CONDITION_URL: Record<string, string> = {
  new: 'https://schema.org/NewCondition',
  used: 'https://schema.org/UsedCondition',
  refurbished: 'https://schema.org/RefurbishedCondition',
};

export function generateProductSchema(input: ProductSchemaInput): WithContext<Product> {
  const url = absoluteUrl(`/product/${input.slug}`);
  const inStock = input.stock > 0;
  const priceValidUntil = input.priceValidUntil || dateFromNow(30);
  const itemCondition = CONDITION_URL[input.condition || 'new'];

  // Shared offer fields (shipping/returns/condition/seller) reused for single &
  // aggregate offers.
  const commonOffer = {
    priceCurrency: CURRENCY,
    availability: availabilityUrl(inStock),
    itemCondition,
    url,
    seller: { '@type': 'Organization' as const, name: siteConfig.name },
    shippingDetails: shippingDetails(),
    hasMerchantReturnPolicy: merchantReturnPolicy(),
  };

  // Build offers: AggregateOffer when variant price range exists, else Offer.
  const prices = (input.variantPrices || []).filter((p) => p > 0);
  const hasRange = prices.length > 1 && Math.min(...prices) !== Math.max(...prices);

  const offers = hasRange
    ? {
        '@type': 'AggregateOffer' as const,
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: prices.length,
        ...commonOffer, // provides priceCurrency, availability, shipping, returns, seller
      }
    : {
        '@type': 'Offer' as const,
        price: input.price,
        priceValidUntil,
        ...commonOffer,
      };

  const schema: WithContext<Product> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description || `${input.name} - Available at ${siteConfig.name}`,
    image: input.images && input.images.length ? input.images : [siteConfig.ogImage],
    brand: { '@type': 'Brand', name: input.brand || siteConfig.name },
    offers: offers as any,
    ...(input.sku && { sku: String(input.sku) }),
    ...(input.gtin && { gtin: input.gtin }),
    ...(input.mpn && { mpn: input.mpn }),
    ...(input.category && { category: input.category }),
  };

  // Star ratings — the biggest SERP CTR lever. Only emit with real reviews.
  if (input.ratingValue && input.reviewCount && input.reviewCount > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(input.ratingValue.toFixed(1)),
      reviewCount: input.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (input.reviews && input.reviews.length) {
    schema.review = input.reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.author },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      ...(r.body && { reviewBody: r.body }),
      ...(r.date && { datePublished: r.date }),
    })) as any;
  }

  return schema;
}

// ─────────────────────────────────────────────────────────────────────────────
// Organization (brand entity)
// ─────────────────────────────────────────────────────────────────────────────

export function generateOrganizationSchema(): WithContext<Organization> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: siteConfig.name,
    url: siteConfig.url,
    logo: absoluteUrl(siteConfig.logo.transparent),
    image: absoluteUrl(siteConfig.ogImage),
    description: siteConfig.description,
    email: siteConfig.contact.email,
    telephone: siteConfig.contact.phone,
    areaServed: siteConfig.areaServed,
    address: {
      '@type': 'PostalAddress',
      streetAddress: siteConfig.contact.address.street,
      addressLocality: siteConfig.contact.address.city,
      addressRegion: siteConfig.contact.address.region,
      addressCountry: siteConfig.contact.address.countryCode,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: siteConfig.contact.phone,
      email: siteConfig.contact.email,
      contactType: 'customer service',
      areaServed: siteConfig.countryCode,
      availableLanguage: ['English'],
    },
    sameAs: getSameAs(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WebSite + Sitelinks Search Box
// ─────────────────────────────────────────────────────────────────────────────

export function generateWebsiteSchema(): WithContext<WebSite> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteConfig.name,
    url: siteConfig.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteConfig.url}/search-result?query={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    } as any,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Breadcrumb
// ─────────────────────────────────────────────────────────────────────────────

export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): WithContext<BreadcrumbList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// ItemList — products on a listing (category / campaign / deals / programmatic)
// ─────────────────────────────────────────────────────────────────────────────

export interface ListItemProduct {
  name: string;
  slug: string;
  image?: string;
  price?: number;
  inStock?: boolean;
}

export function generateItemListSchema(
  products: ListItemProduct[],
  listName?: string
): WithContext<ItemList> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    ...(listName && { name: listName }),
    numberOfItems: products.length,
    itemListElement: products.map((p, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: p.name,
        url: absoluteUrl(`/product/${p.slug}`),
        ...(p.image && { image: p.image }),
        ...(typeof p.price === 'number' && {
          offers: {
            '@type': 'Offer',
            price: p.price,
            priceCurrency: CURRENCY,
            availability: availabilityUrl(p.inStock !== false),
          },
        }),
      },
    })) as any,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CollectionPage — category / campaign / deals hub / programmatic landing
// ─────────────────────────────────────────────────────────────────────────────

export function generateCollectionSchema(input: {
  name: string;
  description?: string;
  url: string;
  image?: string;
}): WithContext<CollectionPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: input.name,
    ...(input.description && { description: input.description }),
    url: absoluteUrl(input.url),
    ...(input.image && { image: input.image }),
    isPartOf: { '@type': 'WebSite', name: siteConfig.name, url: siteConfig.url },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// FAQPage — product FAQs, help pages, programmatic landing pages
// ─────────────────────────────────────────────────────────────────────────────

export function generateFAQSchema(
  faqs: Array<{ question: string; answer: string }>
): WithContext<FAQPage> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}
