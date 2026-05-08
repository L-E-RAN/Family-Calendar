'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const SETTINGS_NAV = [
  { href: '/settings/members', label: 'חברי משפחה' },
  { href: '/settings/integrations', label: 'אינטגרציות' },
  { href: '/settings/screen-time', label: 'זמן מסך' },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4" dir="rtl">
      <h1 className="text-xl font-bold text-gray-900">הגדרות</h1>
      <nav className="flex gap-1 border-b pb-2">
        {SETTINGS_NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-indigo-100 text-indigo-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
