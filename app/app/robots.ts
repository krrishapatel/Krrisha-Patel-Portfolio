import type { MetadataRoute } from 'next';
import { SITE_URL } from './sections';

// Everything here is meant to be found, so the only real job of this file is
// pointing crawlers at the sitemap.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
