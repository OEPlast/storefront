# SEO Implementation Guide

This document outlines the SEO implementation for the Rawura storefront.

## Overview

The storefront now has comprehensive SEO support including:
- Site configuration
- Dynamic metadata generation
- Robots.txt
- XML sitemap
- Structured data (JSON-LD)
- Page-specific optimizations

## Files Created

### 1. Site Configuration
**File**: `src/config/siteConfig.ts`

Contains global site metadata:
- Site name and title template
- Default meta description
- Social media handles
- Base URL
- Default OG image
- Keywords

### 2. SEO Helper
**File**: `src/libs/seo.tsx`

Exports `getDefaultMetadata()` function that:
- Generates Next.js Metadata objects
- Applies site-wide defaults
- Supports OpenGraph and Twitter Card metadata
- Accepts custom overrides per page

### 3. Structured Data Helper
**File**: `src/libs/structured-data.tsx`

Helper functions for JSON-LD schema markup:
- `generateProductSchema()` - Product rich snippets
- `generateOrganizationSchema()` - Organization info
- `generateBreadcrumbSchema()` - Breadcrumb navigation
- `injectStructuredData()` - React component for injection

**Package**: `schema-dts` installed for type-safe schemas

### 4. Robots.txt
**File**: `src/app/robots.ts`

Next.js route handler that generates:
- User-agent rules
- Allow/disallow paths
- Sitemap location
- Blocks sensitive routes (checkout, account, API)

### 5. XML Sitemap
**File**: `src/app/sitemap.ts`

Dynamically generates sitemap with:
- Static pages
- Category pages (fetched from API)
- Product pages (fetched from API)
- Update frequencies and priorities
- Caches for 1 hour (`revalidate = 3600`)

## Pages with SEO

### ✅ Implemented Pages

1. **Root Layout** (`src/app/layout.tsx`)
   - Uses `getDefaultMetadata()`
   - Sets global meta tags

2. **Product Detail** (`src/app/product/[slug]/page.tsx`)
   - Dynamic metadata based on product
   - OG images from product images
   - Structured pricing data
   - Product availability status
   - Already had good SEO - verified

3. **Category** (`src/app/category/[slug]/page.tsx`)
   - Dynamic metadata from category
   - Category descriptions
   - OG images

4. **Campaign** (`src/app/campaign/[slug]/page.tsx`)
   - Campaign-specific metadata
   - Banner images in OG tags
   - Keywords for offers/deals

5. **Search Results** (`src/app/search-result/page.tsx`)
   - Dynamic title based on search query
   - Query-specific descriptions

6. **Order Tracking** (`src/app/order-tracking/page.tsx`)
   - Static metadata optimized for tracking
   - Keywords for delivery/shipment

7. **New Products** (`src/app/new-products/page.tsx`)
   - Optimized for "new arrivals"
   - Keywords targeting fresh products

8. **Privacy Policy** (`src/app/privacy-policy/page.tsx`)
   - Legal page optimization
   - Clear description for users

## Usage Examples

### Basic Page SEO
```typescript
import { getDefaultMetadata } from '@/libs/seo';

export const metadata = getDefaultMetadata({
  title: 'Page Title',
  description: 'Page description for SEO',
  keywords: ['keyword1', 'keyword2'],
});
```

### Dynamic SEO (with API data)
```typescript
export async function generateMetadata({ params }) {
  const data = await fetchData(params.id);
  
  return getDefaultMetadata({
    title: data.name,
    description: data.description,
    openGraph: {
      images: [{ url: data.image, alt: data.name }],
    },
  });
}
```

### Adding Structured Data
```typescript
import { generateProductSchema, injectStructuredData } from '@/libs/structured-data';

export default function ProductPage({ product }) {
  const schema = generateProductSchema(product);
  
  return (
    <>
      {injectStructuredData(schema)}
      {/* rest of page */}
    </>
  );
}
```

## Robots.txt Configuration

Current configuration:
- **Allow**: All pages by default
- **Disallow**: 
  - `/api/*` - API endpoints
  - `/my-account/*` - User accounts
  - `/checkout/*` - Checkout flows
  - `/checkout2/*` - Alternative checkout
- **Sitemap**: Points to `/sitemap.xml`

## Sitemap Priority Guide

- **1.0** - Homepage
- **0.9** - Category listing
- **0.8** - Individual categories, top products
- **0.7** - Individual products, blog
- **0.5-0.6** - Support pages
- **0.3** - Legal pages

## Best Practices Implemented

1. ✅ **Title Templates** - Consistent branding with `%s | Rawura`
2. ✅ **Meta Descriptions** - 155 character limit
3. ✅ **OpenGraph Tags** - Social media previews
4. ✅ **Twitter Cards** - Twitter-specific metadata
5. ✅ **Canonical URLs** - Prevent duplicate content
6. ✅ **Structured Data** - Rich snippets for products
7. ✅ **Mobile-Friendly** - Responsive metadata
8. ✅ **Performance** - Static generation where possible
9. ✅ **Keywords** - Relevant keywords per page
10. ✅ **Sitemap** - Auto-updated from database

## Testing SEO

### Manual Testing
1. View page source - check meta tags
2. Use browser DevTools - verify OG tags
3. Test social sharing - preview on Twitter/Facebook
4. Check `/robots.txt` - verify rules
5. Check `/sitemap.xml` - verify URLs

### Tools
- **Google Search Console** - Submit sitemap
- **Meta Tags Debugger** - Test OG tags
- **Lighthouse** - SEO audit score
- **Schema Markup Validator** - Validate structured data
- **Mobile-Friendly Test** - Check mobile rendering

## Next Steps (Optional Enhancements)

1. **Blog SEO** - Add metadata to blog pages (currently client components)
2. **Alternate Languages** - hreflang tags for i18n
3. **Breadcrumb Schema** - Add to all pages
4. **FAQ Schema** - For help/support pages
5. **Review Schema** - Product reviews rich snippets
6. **Video Schema** - If product videos exist
7. **Local Business** - If physical store locations
8. **RSS Feed** - For blog content
9. **AMP Pages** - Mobile-optimized versions
10. **Web Vitals** - Optimize Core Web Vitals

## Configuration Checklist

Before going to production:

- [ ] Update `siteConfig.url` to production domain
- [ ] Update `siteConfig.ogImage` to actual image path
- [ ] Update `siteConfig.twitter` handle
- [ ] Verify `robots.ts` disallow paths
- [ ] Test sitemap generation with production data
- [ ] Submit sitemap to Google Search Console
- [ ] Verify all meta tags in production
- [ ] Test social media cards
- [ ] Run Lighthouse SEO audit
- [ ] Validate structured data

## Maintenance

### Regular Tasks
- **Weekly**: Monitor Search Console for errors
- **Monthly**: Review top queries and optimize
- **Quarterly**: Update sitemap priorities
- **As Needed**: Add new pages to sitemap logic

### When Adding New Pages
1. Add metadata using `getDefaultMetadata()`
2. Include relevant keywords
3. Add OG images
4. Update sitemap if needed
5. Test metadata rendering

## Resources

- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Schema.org Documentation](https://schema.org/)
- [Google Search Console](https://search.google.com/search-console)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Cards](https://developer.twitter.com/en/docs/twitter-for-websites/cards)
