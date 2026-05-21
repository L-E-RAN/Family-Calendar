'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { ShoppingCart, PawPrint, Wrench, Package, Plus, Bot, AlertCircle } from 'lucide-react'
import type {
  Profile, ShoppingItem, PetEvent, HomeMaintenanceTask, HomeAsset
} from '@/types'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TodayDashboardProps {
  profile: Profile
  openShoppingCount: number
  petDueItems: PetEvent[]
  maintenanceDueSoon: HomeMaintenanceTask[]
  warrantyExpiringSoon: HomeAsset[]
}

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  if (hour < 12) return `בוקר טוב, ${name}`
  if (hour < 17) return `צהריים טובים, ${name}`
  return `ערב טוב, ${name}`
}

function HebrewDate() {
  const now = new Date()
  const dateStr = format(now, 'EEEE, d בMMMM yyyy', { locale: he })
  return <span>{dateStr}</span>
}

interface QuickAddProps {
  profileId: string
}

function QuickAdd({ profileId }: QuickAddProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    try {
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.trim(), raw_input: text.trim() }),
      })
      setText('')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="הוסף מהר... לקנות, להזמין, לזכור"
        className="flex-1 border rounded-xl px-4 py-3 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        dir="rtl"
        disabled={loading}
      />
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="bg-indigo-600 text-white rounded-xl px-4 py-3 text-sm font-medium disabled:opacity-50 flex items-center gap-1"
      >
        <Plus className="w-4 h-4" />
        הוסף
      </button>
    </form>
  )
}

interface DashCardProps {
  href: string
  icon: React.ElementType
  iconColor: string
  label: string
  value: string | number
  sub?: string
  urgent?: boolean
}

function DashCard({ href, icon: Icon, iconColor, label, value, sub, urgent }: DashCardProps) {
  return (
    <Link href={href} className={cn(
      'flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border transition-all hover:shadow-md active:scale-[0.98]',
      urgent && 'border-orange-300 bg-orange-50'
    )}>
      <div className={cn('p-2 rounded-xl', iconColor)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('font-semibold text-sm truncate', urgent ? 'text-orange-700' : 'text-gray-900')}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground truncate">{sub}</p>}
      </div>
      {urgent && <AlertCircle className="w-4 h-4 text-orange-500 shrink-0" />}
    </Link>
  )
}

export default function TodayDashboard({
  profile,
  openShoppingCount,
  petDueItems,
  maintenanceDueSoon,
  warrantyExpiringSoon,
}: TodayDashboardProps) {
  const greeting = getGreeting(profile.display_name)

  const petUrgent = petDueItems.length > 0
  const maintenanceUrgent = maintenanceDueSoon.some(t => {
    if (!t.due_at) return false
    return new Date(t.due_at) < new Date()
  })
  const warrantyUrgent = warrantyExpiringSoon.length > 0

  return (
    <div className="space-y-4" dir="rtl">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{greeting}</h1>
        <p className="text-sm text-muted-foreground">
          <HebrewDate />
        </p>
      </div>

      {/* Quick add */}
      <QuickAdd profileId={profile.id} />

      {/* OS Dashboard cards */}
      <div className="grid grid-cols-2 gap-3">
        <DashCard
          href="/shopping"
          icon={ShoppingCart}
          iconColor="bg-green-100 text-green-600"
          label="קניות פתוחות"
          value={openShoppingCount > 0 ? `${openShoppingCount} פריטים` : 'רשימה ריקה'}
          sub="לחץ לעריכה"
        />

        <DashCard
          href="/pets"
          icon={PawPrint}
          iconColor={petUrgent ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}
          label="צ'ארלי"
          value={petUrgent ? `${petDueItems.length} תזכורות` : 'הכל בסדר'}
          sub={petDueItems[0]?.title}
          urgent={petUrgent}
        />

        <DashCard
          href="/maintenance"
          icon={Wrench}
          iconColor={maintenanceUrgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}
          label="תחזוקת בית"
          value={maintenanceDueSoon.length > 0 ? `${maintenanceDueSoon.length} משימות` : 'ללא משימות'}
          sub={maintenanceDueSoon[0]?.title}
          urgent={maintenanceUrgent}
        />

        <DashCard
          href="/assets"
          icon={Package}
          iconColor={warrantyUrgent ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'}
          label="אחריות"
          value={warrantyUrgent ? `${warrantyExpiringSoon.length} פגות בקרוב` : 'הכל תקין'}
          sub={warrantyExpiringSoon[0]?.name}
          urgent={warrantyUrgent}
        />
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <Link
          href="/assistant"
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Bot className="w-4 h-4" />
          סכם לי את היום
        </Link>
        <Link
          href="/tasks?new=1"
          className="flex-1 flex items-center justify-center gap-2 bg-white border rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          הוסף משימה
        </Link>
      </div>

      <div className="border-t pt-4">
        <h2 className="text-base font-semibold text-gray-800 mb-3">לוח היום</h2>
      </div>
    </div>
  )
}
