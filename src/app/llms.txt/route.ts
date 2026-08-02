import { siteConfig } from '@/config/siteConfig';

// Static, cacheable. `llms.txt` gives AI answer engines a clean summary of the
// store, key surfaces, and policies so they can cite Rawura accurately.
export const dynamic = 'force-static';

export function GET() {
  const url = siteConfig.url;
  const body = `# ${siteConfig.name}

> ${siteConfig.description}

${siteConfig.name} is an online store serving ${siteConfig.country}. We offer affordable, quality
products with free delivery nationwide and a ${siteConfig.policy.returnDays}-day return policy.

## Key pages
- Home: ${url}/
- Deals & offers: ${url}/deals
- Categories: ${url}/category/<category-slug>
- Products: ${url}/product/<product-slug>
- Search: ${url}/search-result?query=<query>
- Blog / buying guides: ${url}/blog
- Contact: ${url}/pages/contact
- FAQs: ${url}/pages/faqs

## Shipping & returns
- Free delivery across ${siteConfig.country}.
- Delivery estimate: ${siteConfig.policy.deliveryDaysMin}-${siteConfig.policy.deliveryDaysMax} business days.
- Returns accepted within ${siteConfig.policy.returnDays} days.

## Contact
- Email: ${siteConfig.contact.email}
- Phone: ${siteConfig.contact.phone}
- Location: ${siteConfig.contact.address.city}, ${siteConfig.contact.address.country}

## Structured data
Product, Offer, AggregateRating, BreadcrumbList, ItemList, CollectionPage,
Organization and WebSite schema.org markup is published across the site.

## Sitemap
${url}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
