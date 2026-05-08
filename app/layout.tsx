import type { Metadata, Viewport } from 'next'
import { Rubik, Suez_One, Varela_Round } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const rubik = Rubik({ subsets: ['latin', 'hebrew'], variable: '--font-rubik' })
const suezOne = Suez_One({ weight: '400', subsets: ['latin', 'hebrew'], variable: '--font-display' })
const varelaRound = Varela_Round({ weight: '400', subsets: ['latin', 'hebrew'], variable: '--font-casual' })

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
    <html lang="he" dir="rtl" className={`${rubik.variable} ${suezOne.variable} ${varelaRound.variable}`}>
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
