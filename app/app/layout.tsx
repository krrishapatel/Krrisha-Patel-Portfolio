import './global.css'
import type { Metadata } from 'next'
import { META, OG_IMAGE, SITE_URL } from './sections'

// Defaults for the whole site. Each section overrides title, description and
// canonical in [section]/page.tsx; everything below is either shared or a
// fallback, and About's copy is the default because / is About.
export const metadata: Metadata = {
  // Scrapers require absolute image URLs. metadataBase is what lets the
  // relative '/og.png' below resolve to https://…/og.png in the rendered tag —
  // without it Next warns and emits a relative URL that no scraper can fetch.
  metadataBase: new URL(SITE_URL),
  title: META.about.title,
  description: META.about.description,
  alternates: { canonical: '/' },
  openGraph: {
    title: META.about.title,
    description: META.about.description,
    url: '/',
    siteName: 'Krrisha Patel',
    locale: 'en_US',
    type: 'website',
    // The preview card: the site's own three origami figures over the site's
    // own palette and type, so a shared link looks like the page it opens.
    // Without this every link rendered as a bare grey rectangle.
    images: [OG_IMAGE],
  },
  // Twitter/X ignores og: tags in favour of its own. summary_large_image is
  // what makes the card render full-width rather than as a thumbnail.
  twitter: {
    card: 'summary_large_image',
    title: META.about.title,
    description: META.about.description,
    images: [OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="text-slate-100 bg-slate-900">
      <body className="antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}
