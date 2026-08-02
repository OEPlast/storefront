import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/siteConfig';
import { serverAPI } from '@/libs/api/serverAPI';
import api from '@/libs/api/endpoints';
import { getAllIntentSlugs } from '@/config/intents';
import type { IntentSlugItem } from '@/config/intents';
import { getCdnUrl } from '@/libs/cdn-url';

// Cache the sitemap for 1 hour
export const revalidate = 3600;

// A single sitemap is served at /sitemap.xml (which robots.txt references) and
// works identically in dev + prod. Google's per-sitemap limit is 50,000 URLs;
// the catalogue is well under that. When it approaches the limit, split into a
// sitemap index via `generateSitemaps` (children at /sitemap/<id>.xml) — but note
// that path must also be reflected in robots.ts.
const MAX_URLS = 50000;

interface SlugItem {
  slug: string;
  updatedAt?: string;
  image?: string;
  coverImage?: string;
}

async function fetchProducts(): Promise<SlugItem[]> {
  try {
    const res = await serverAPI.get<SlugItem[]>(api.sitemap.products);
    return res.data || [];
  } catch (error) {
    console.error('[sitemap] products fetch failed:', error);
    return [];
  }
}

async function fetchCategories(): Promise<SlugItem[]> {
  try {
    const res = await serverAPI.get<SlugItem[]>(api.sitemap.categories);
    return res.data || [];
  } catch (error) {
    console.error('[sitemap] categories fetch failed:', error);
    return [];
  }
}

async function fetchCampaigns(): Promise<SlugItem[]> {
  try {
    // /campaigns/all returns { data: { campaigns: [...] } }.
    const res = await serverAPI.get<{ campaigns?: Array<{ slug?: string; updatedAt?: string }> }>(
      api.campaigns.list
    );
    const campaigns = res.data?.campaigns || [];
    return campaigns
      .filter((c) => !!c?.slug)
      .map((c) => ({ slug: c.slug as string, updatedAt: c.updatedAt }));
  } catch (error) {
    console.error('[sitemap] campaigns fetch failed:', error);
    return [];
  }
}

async function fetchIntents(): Promise<IntentSlugItem[]> {
  // Returns only `active` intent shops — drafts must never reach the sitemap.
  return getAllIntentSlugs();
}

function imageUrls(item: SlugItem): string[] | undefined {
  const raw = item.image || item.coverImage;
  if (!raw) return undefined;
  try {
    const url = getCdnUrl(raw);
    return url ? [url] : undefined;
  } catch {
    return undefined;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/deals`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/new-products`, lastModified: now, changeFrequency: 'daily', priority: 0.7 },
    { url: `${baseUrl}/top-sold-products`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/week-products`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: `${baseUrl}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${baseUrl}/pages/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/pages/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/pages/faqs`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${baseUrl}/privacy-policy`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
  ];

  const [products, categories, campaigns, intents] = await Promise.all([
    fetchProducts(),
    fetchCategories(),
    fetchCampaigns(),
    fetchIntents(),
  ]);

  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${baseUrl}/category/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.8,
    images: imageUrls(c),
  }));

  const campaignPages: MetadataRoute.Sitemap = campaigns.map((c) => ({
    url: `${baseUrl}/campaign/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const intentPages: MetadataRoute.Sitemap = intents.map((i) => ({
    url: `${baseUrl}/shop/${i.slug}`,
    lastModified: i.updatedAt ? new Date(i.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${baseUrl}/product/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: 'weekly',
    priority: 0.7,
    images: imageUrls(p),
  }));

  return [...staticPages, ...categoryPages, ...campaignPages, ...intentPages, ...productPages].slice(
    0,
    MAX_URLS
  );
}
