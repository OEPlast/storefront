import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/siteConfig';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/my-account/', '/checkout/', '/checkout2/'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
