import { notFound } from 'next/navigation';
import Portfolio from '../Portfolio';
import { SECTIONS } from '../sections';

// One static route per section, so /ventures is a real page a crawler can index
// rather than a fragment. About is excluded: it lives at / instead.
export function generateStaticParams() {
  return SECTIONS.filter((s) => s !== 'about').map((section) => ({ section }));
}

// Nothing outside SECTIONS exists, so /banana 404s rather than quietly showing
// About under the wrong URL.
export const dynamicParams = false;

export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(SECTIONS as readonly string[]).includes(section) || section === 'about') notFound();
  return <Portfolio section={section} />;
}
