import './global.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Krrisha Patel | Portfolio',
  description: 'Computer science & finance @ UPenn M&T, building innovative solutions + creating art',
  openGraph: {
    title: 'Krrisha Patel | Portfolio',
    description: 'Computer science & finance @ UPenn M&T, building innovative solutions + creating art',
    url: 'https://krrishapatel.com',
    siteName: 'Krrisha Patel Portfolio',
    locale: 'en_US',
    type: 'website',
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
