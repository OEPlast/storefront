import { siteConfig } from '@/config/siteConfig';
import { formatNaira, getShippingConfig, getStoreBranding } from '@/libs/storeBranding';

// `llms.txt` gives AI answer engines a clean summary of the store, key surfaces, and policies so
// they can cite the store accurately. Built from Store Settings and the checkout delivery config
// (both cached by Next), and regenerated hourly so an edit in the admin shows up here.
export const revalidate = 3600;

export async function GET() {
  const url = siteConfig.url;
  const [branding, shipping] = await Promise.all([getStoreBranding(), getShippingConfig()]);
  const { storeName, supportEmail, supportPhone, whatsappNumber, addressLine, policies } = branding;

  const shippingLines = [
    shipping.deliveryEnabled && `- Delivery across ${siteConfig.country}; cost is calculated at checkout from the address.`,
    shipping.freeShippingThreshold && `- Free delivery on orders over ${formatNaira(shipping.freeShippingThreshold)}.`,
    shipping.deliveryWindowLabel && `- Delivery estimate: ${shipping.deliveryWindowLabel} after dispatch.`,
    shipping.pickupEnabled && '- Store pickup is available at checkout.',
    `- Returns accepted within ${policies.returnWindowDays} days of delivery.`,
  ].filter(Boolean);

  const contactLines = [
    supportEmail && `- Email: ${supportEmail}`,
    supportPhone && `- Phone: ${supportPhone}`,
    whatsappNumber && `- WhatsApp: ${whatsappNumber}`,
    addressLine && `- Address: ${addressLine}`,
  ].filter(Boolean);

  const body = `# ${storeName}

> ${siteConfig.description}

${storeName} is an online store serving ${siteConfig.country}.

## Key pages
- Home: ${url}/
- Deals & offers: ${url}/deals
- Categories: ${url}/category/<category-slug>
- Products: ${url}/product/<product-slug>
- Search: ${url}/search-result?query=<query>
- Order tracking: ${url}/order-tracking
- Contact: ${url}/pages/contact
- FAQs: ${url}/pages/faqs
- Shipping & delivery: ${url}/pages/shipping
- Returns & refunds: ${url}/pages/returns
- Terms of use: ${url}/pages/terms
- Privacy policy: ${url}/privacy-policy

## Shipping & returns
${shippingLines.join('\n')}
${contactLines.length ? `\n## Contact\n${contactLines.join('\n')}\n` : ''}
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
