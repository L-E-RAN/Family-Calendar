'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CalendarDays, Sun, CheckSquare, Users, Settings, Tablet,
  ShoppingCart, Inbox, FileText, Package, PawPrint, Wrench,
  Bot, MoreHorizontal, Bell
} from 'lucide-react'
import type { Profile, Child } from '@/types'
import { cn } from '@/lib/utils'
import { createContext, useContext, useState } from 'react'

interface AppContext {
  profile: Profile & { child?: Child }
  children: Child[]
}

const AppCtx = createContext<AppContext>({ profile: {} as AppContext['profile'], children: [] })
export const useApp = () => useContext(AppCtx)

const ALL_NAV = [
  { href: '/today',    icon: Sun,          label: 'היום' },
  { href: '/calendar', icon: CalendarDays, label: 'לוח שנה' },
  { href: '/tasks',    icon: CheckSquare,  label: 'משימות' },
  { href: '/shopping', icon: ShoppingCart, label: 'קניות' },
  { href: '/inbox',    icon: Inbox,        label: 'תיבת משפחה' },
  { href: '/documents',icon: FileText,     label: 'מסמכים' },
  { href: '/assets',   icon: Package,      label: 'מוצרים' },
  { href: '/pets',     icon: PawPrint,     label: "צ'ארלי" },
  { href: '/maintenance', icon: Wrench,    label: 'תחזוקה' },
  { href: '/assistant',icon: Bot,          label: 'עוזר' },
  { href: '/children', icon: Users,        label: 'ילדים' },
  { href: '/settings/integrations', icon: Settings, label: 'הגדרות' },
]

// Bottom nav: 5 primary items + "more" sheet
const BOTTOM_PRIMARY = ['/today', '/calendar', '/tasks', '/shopping', '/inbox']

export default function AppShell({
  profile,
  children: familyChildren,
  reactChildren,
}: {
  profile: Profile & { child?: Child }
  children: Child[]
  reactChildren: React.ReactNode
}) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)

  const primaryNav = ALL_NAV.filter(n => BOTTOM_PRIMARY.includes(n.href))
  const moreNav = ALL_NAV.filter(n => !BOTTOM_PRIMARY.includes(n.href))

  return (
    <AppCtx.Provider value={{ profile, children: familyChildren }}>
      <div className="flex flex-col min-h-screen">
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex flex-col w-60 border-l bg-white shadow-sm">
            <div className="p-4 border-b">
              <h1 className="text-lg font-bold text-indigo-700">🏠 Family OS</h1>
              <p className="text-sm text-muted-foreground">משפחת אשואל</p>
            </div>
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
              {ALL_NAV.map(item => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname.startsWith(item.href)
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t">
              <p className="text-xs text-muted-foreground">שלום, {profile.display_name}</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto pb-16 lg:pb-0">
            {reactChildren}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-50">
          <div className="flex">
            {primaryNav.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center py-2 text-xs transition-colors',
                  pathname.startsWith(item.href) ? 'text-indigo-700' : 'text-gray-500'
                )}
              >
                <item.icon className={cn('w-5 h-5 mb-0.5', pathname.startsWith(item.href) ? 'text-indigo-700' : 'text-gray-400')} />
                {item.label}
              </Link>
            ))}
            {/* More button */}
            <button
              onClick={() => setMoreOpen(v => !v)}
              className={cn(
                'flex-1 flex flex-col items-center py-2 text-xs transition-colors',
                moreOpen ? 'text-indigo-700' : 'text-gray-500'
              )}
            >
              <MoreHorizontal className={cn('w-5 h-5 mb-0.5', moreOpen ? 'text-indigo-700' : 'text-gray-400')} />
              עוד
            </button>
          </div>
        </nav>

        {/* Mobile "more" drawer */}
        {moreOpen && (
          <div className="lg:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
            <div
              className="absolute bottom-16 inset-x-0 bg-white border-t rounded-t-2xl shadow-xl p-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="grid grid-cols-4 gap-2">
                {moreNav.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-medium transition-colors',
                      pathname.startsWith(item.href)
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppCtx.Provider>
  )
}
