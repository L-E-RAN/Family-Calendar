import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'לוח שנה משפחתי | משפחת אשואל',
  description: 'לוח שנה משפחתי - שיעורי בית, מבחנים, אירועים ומשימות',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'לוח שנה',
  },
}

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={geist.variable}>
      <head>
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased bg-background min-h-screen">
        {children}
        <Toaster position="top-center" dir="rtl" />
      </body>
    </html>
  )
}
