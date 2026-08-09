import './global.css'
import type { Metadata } from 'next'
import { baseUrl } from './sitemap'

const description =
  'Computer science & finance @ UPenn M&T, building innovative solutions + creating art'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: 'Krrisha Patel | Portfolio',
  description,
  openGraph: {
    title: 'Krrisha Patel | Portfolio',
    description,
    url: baseUrl,
    siteName: 'Krrisha Patel Portfolio',
    locale: 'en_US',
    type: 'website',
    images: [{ url: '/og?title=Krrisha%20Patel', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Krrisha Patel | Portfolio',
    description,
    images: ['/og?title=Krrisha%20Patel'],
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
    <html lang="en" className="text-black bg-white">
      <body className="antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  )
}
