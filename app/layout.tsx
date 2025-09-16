import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vocilia - Voice Feedback & Cashback',
  description: 'Share your experience and earn cashback through voice feedback',
  keywords: ['feedback', 'cashback', 'voice', 'rewards', 'customer experience'],
  authors: [{ name: 'Vocilia Team' }],
  creator: 'Vocilia',
  publisher: 'Vocilia',
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
  icons: {
    icon: [
      { url: '/icons/icon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'mask-icon', url: '/icons/safari-pinned-tab.svg', color: '#3b82f6' },
    ],
  },
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#3b82f6' },
    { media: '(prefers-color-scheme: dark)', color: '#1e40af' },
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vocilia',
  },
  openGraph: {
    type: 'website',
    siteName: 'Vocilia',
    title: 'Vocilia - Voice Feedback & Cashback',
    description: 'Share your experience and earn cashback through voice feedback',
    url: 'https://vocilia.com',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Vocilia - Voice Feedback & Cashback',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@vocilia',
    title: 'Vocilia - Voice Feedback & Cashback',
    description: 'Share your experience and earn cashback through voice feedback',
    images: ['/twitter-image.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Register service worker for PWA functionality
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered with scope: ', registration.scope);
                    }, function(err) {
                      console.log('SW registration failed: ', err);
                    });
                });
              }
            `
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}