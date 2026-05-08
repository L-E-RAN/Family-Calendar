'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Sun, CheckSquare, Users, Settings } from 'lucide-react'
import type { Profile, Child } from '@/types'
import { cn } from '@/lib/utils'
import { createContext, useContext } from 'react'

interface AppContext {
  profile: Profile & { child?: Child }
  children: Child[]
}

const AppCtx = createContext<AppContext>({ profile: {} as AppContext['profile'], children: [] })
export const useApp = () => useContext(AppCtx)

const NAV = [
  { href: '/today', icon: Sun, label: 'היום' },
  { href: '/calendar', icon: CalendarDays, label: 'לוח' },
  { href: '/tasks', icon: CheckSquare, label: 'משימות' },
  { href: '/children', icon: Users, label: 'ילדים' },
  { href: '/settings/integrations', icon: Settings, label: 'הגדרות' },
]

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

  return (
    <AppCtx.Provider value={{ profile, children: familyChildren }}>
      <div className="flex flex-col min-h-screen">
        {/* Desktop sidebar + mobile bottom nav */}
        <div className="flex flex-1 overflow-hidden">
          {/* Desktop sidebar */}
          <aside className="hidden md:flex flex-col w-56 border-l bg-white shadow-sm">
            <div className="p-4 border-b">
              <h1 className="text-lg font-bold text-indigo-700">📅 לוח שנה</h1>
              <p className="text-sm text-muted-foreground">משפחת אשואל</p>
            </div>
            <nav className="flex-1 p-2 space-y-1">
              {NAV.map(item => (
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
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t">
              <p className="text-xs text-muted-foreground">שלום, {profile.display_name}</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            {reactChildren}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t shadow-lg z-50">
          <div className="flex">
            {NAV.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex-1 flex flex-col items-center py-2 text-xs transition-colors',
                  pathname.startsWith(item.href)
                    ? 'text-indigo-700'
                    : 'text-gray-500'
                )}
              >
                <item.icon className={cn('w-5 h-5 mb-0.5', pathname.startsWith(item.href) ? 'text-indigo-700' : 'text-gray-400')} />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </AppCtx.Provider>
  )
}
