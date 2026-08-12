import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Portfolio from '../Portfolio';
import { META, OG_IMAGE, SECTIONS } from '../sections';

// One static route per section, so /ventures is a real page a crawler can index
// rather than a fragment. About is excluded: it lives at / instead.
export function generateStaticParams() {
  return SECTIONS.filter((s) => s !== 'about').map((section) => ({ section }));
}

// Nothing outside SECTIONS exists, so /banana 404s rather than quietly showing
// About under the wrong URL.
export const dynamicParams = false;

// Each section gets its own title, description and canonical URL. The image has
// to be restated rather than inherited — see OG_IMAGE for why.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const meta = META[section as keyof typeof META];
  if (!meta) return {};
  return {
    title: meta.title,
    description: meta.description,
    alternates: { canonical: `/${section}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/${section}`,
      siteName: 'Krrisha Patel',
      locale: 'en_US',
      type: 'website',
      images: [OG_IMAGE],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [OG_IMAGE.url],
    },
  };
}

export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(SECTIONS as readonly string[]).includes(section) || section === 'about') notFound();
  return <Portfolio section={section} />;
}
