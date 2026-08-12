import type { MetadataRoute } from 'next';
import { SECTIONS, SITE_URL } from './sections';

/*
  The sitemap is how the six sections get discovered at all.

  They became real routes when they stopped being hash fragments, but the nav
  renders them as <a> elements whose clicks are intercepted — and a crawler that
  can't run the interception still needs to be told the set exists. Listing them
  here means Google is handed all six URLs directly rather than inferring them.

  Derived from SECTIONS rather than written out, so adding a section can't leave
  a page unlisted. About is mapped to / because that's where it lives.
*/
export default function sitemap(): MetadataRoute.Sitemap {
  return SECTIONS.map((section) => ({
    url: section === 'about' ? SITE_URL : `${SITE_URL}/${section}`,
    // About is the entry point and the one worth crawling first; the rest are
    // siblings of equal weight.
    priority: section === 'about' ? 1 : 0.8,
    changeFrequency: 'monthly' as const,
  }));
}
