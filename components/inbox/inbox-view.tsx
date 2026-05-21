'use client'

import { useState } from 'react'
import {
  Inbox, Plus, CheckSquare, ShoppingCart, CalendarDays,
  PawPrint, Wrench, FileText, Archive, ChevronRight
} from 'lucide-react'
import type { FamilyInboxItem, InboxSuggestedType } from '@/types'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { useRouter } from 'next/navigation'

const TYPE_LABELS: Record<InboxSuggestedType, { label: string; icon: React.ElementType; color: string }> = {
  task:             { label: 'משימה',        icon: CheckSquare,   color: 'text-blue-600 bg-blue-50' },
  shopping_item:    { label: 'קנייה',         icon: ShoppingCart,  color: 'text-green-600 bg-green-50' },
  event:            { label: 'אירוע',         icon: CalendarDays,  color: 'text-purple-600 bg-purple-50' },
  document:         { label: 'מסמך',          icon: FileText,      color: 'text-yellow-600 bg-yellow-50' },
  pet_event:        { label: "צ'ארלי",        icon: PawPrint,      color: 'text-pink-600 bg-pink-50' },
  maintenance_task: { label: 'תחזוקה',        icon: Wrench,        color: 'text-orange-600 bg-orange-50' },
  warranty_item:    { label: 'אחריות',        icon: FileText,      color: 'text-red-600 bg-red-50' },
}

const CONVERT_OPTIONS: { type: InboxSuggestedType; label: string; href: (title: string) => string }[] = [
  { type: 'task',             label: 'הפוך למשימה',   href: (t) => `/tasks?new=1&title=${encodeURIComponent(t)}` },
  { type: 'shopping_item',    label: 'הוסף לקניות',   href: (t) => `/shopping?add=${encodeURIComponent(t)}` },
  { type: 'event',            label: 'הוסף לאירועים',  href: (t) => `/calendar?new=1&title=${encodeURIComponent(t)}` },
  { type: 'pet_event',        label: "הוסף לצ'ארלי",  href: (t) => `/pets?new=1&title=${encodeURIComponent(t)}` },
  { type: 'maintenance_task', label: 'הוסף לתחזוקה',  href: (t) => `/maintenance?new=1&title=${encodeURIComponent(t)}` },
]

interface Props {
  initialItems: FamilyInboxItem[]
}

export default function InboxView({ initialItems }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<FamilyInboxItem[]>(initialItems)
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function addItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newText.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newText.trim(), raw_input: newText.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setItems(prev => [data, ...prev])
        setNewText('')
      }
    } finally {
      setLoading(false)
    }
  }

  async function archiveItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await fetch(`/api/inbox/${id}`, { method: 'DELETE' })
  }

  return (
    <div dir="rtl" className="space-y-4">
      {/* Quick capture */}
      <form onSubmit={addItem} className="flex gap-2">
        <input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder='לקנות חלב, לתת ברווקטו לצ׳ארלי, לתקן...'
          className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !newText.trim()}
          className="bg-indigo-600 text-white rounded-xl px-4 py-3 disabled:opacity-50"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {/* Items */}
      {items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">תיבת המשפחה ריקה</p>
          <p className="text-xs mt-1">הוסף פריטים בשורה למעלה</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <InboxCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onExpand={() => setExpandedId(id => id === item.id ? null : item.id)}
              onArchive={() => archiveItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function InboxCard({
  item,
  expanded,
  onExpand,
  onArchive,
}: {
  item: FamilyInboxItem
  expanded: boolean
  onExpand: () => void
  onArchive: () => void
}) {
  const dateStr = format(new Date(item.created_at), 'd MMM', { locale: he })

  return (
    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={onExpand}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
          <p className="text-xs text-gray-400">{dateStr}</p>
        </div>
        <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', expanded && 'rotate-90')} />
      </div>

      {expanded && (
        <div className="border-t px-3 py-3 space-y-2">
          {item.body && <p className="text-sm text-gray-600">{item.body}</p>}
          <p className="text-xs font-medium text-gray-500 mb-1">המר ל:</p>
          <div className="grid grid-cols-2 gap-2">
            {CONVERT_OPTIONS.map(opt => {
              const meta = TYPE_LABELS[opt.type]
              const Icon = meta.icon
              return (
                <a
                  key={opt.type}
                  href={opt.href(item.title)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-colors hover:opacity-80',
                    meta.color
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {opt.label}
                </a>
              )
            })}
          </div>
          <div className="flex justify-end pt-1">
            <button
              onClick={onArchive}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <Archive className="w-3.5 h-3.5" />
              העבר לארכיון
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
