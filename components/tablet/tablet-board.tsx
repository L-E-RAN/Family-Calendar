'use client'

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import { useRouter } from 'next/navigation'
import { Settings, LogOut } from 'lucide-react'
import type { TodayBoard } from '@/types'
import TabletMemberColumn from './tablet-member-column'
import PinPad from './pin-pad'
import { useTablet } from './tablet-context'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Props {
  board: TodayBoard
}

export default function TabletBoard({ board }: Props) {
  const router = useRouter()
  const { requestPin } = useTablet()
  const [activeMobileIdx, setActiveMobileIdx] = useState(0)

  const dateStr = format(new Date(board.date + 'T12:00:00'), 'EEEE, d בMMMM yyyy', { locale: he })

  const handleCompletionChange = useCallback(() => {
    router.refresh()
  }, [router])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tablet-completions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_item_completions', filter: `date=eq.${board.date}` },
        () => router.refresh()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [board.date, router])

  const activeColumns = board.columns.filter(c => c.type !== 'placeholder')

  function goToSettings() {
    requestPin(() => router.push('/settings/integrations'))
  }

  return (
    <div className="min-h-screen p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">מסך משפחתי</h1>
          <p className="text-muted-foreground text-sm">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToSettings}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border rounded-lg px-3 py-1.5 hover:bg-gray-100 transition-colors"
            title="הגדרות (דורש PIN)"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">הגדרות</span>
          </button>
        </div>
      </div>

      {/* Desktop/Tablet grid */}
      <div className={`hidden md:grid gap-3 items-start`} style={{
        gridTemplateColumns: `repeat(${Math.min(activeColumns.length, 4)}, minmax(0, 1fr))`
      }}>
        {activeColumns.map((member, idx) => (
          <TabletMemberColumn
            key={idx}
            member={member}
            onCompletionChange={handleCompletionChange}
          />
        ))}
      </div>

      {/* Mobile: tabs + single column */}
      <div className="md:hidden space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {activeColumns.map((member, idx) => {
            const name = member.child?.name ?? member.profile?.display_name ?? '—'
            const color = member.child?.color ?? '#6366f1'
            const isActive = idx === activeMobileIdx
            return (
              <button
                key={idx}
                onClick={() => setActiveMobileIdx(idx)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isActive ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600'
                }`}
                style={isActive ? { backgroundColor: color, borderColor: color } : {}}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: isActive ? 'white' : color }} />
                {name}
              </button>
            )
          })}
        </div>
        {activeColumns[activeMobileIdx] && (
          <TabletMemberColumn
            member={activeColumns[activeMobileIdx]}
            onCompletionChange={handleCompletionChange}
          />
        )}
      </div>

      {/* PIN pad overlay */}
      <PinPad />
    </div>
  )
}
