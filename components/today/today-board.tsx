'use client'

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import type { TodayBoard } from '@/types'
import MemberColumn from './member-column'
import { useRouter } from 'next/navigation'

interface Props {
  board: TodayBoard
}

export default function TodayBoard({ board }: Props) {
  const router = useRouter()
  const [activeMobileIdx, setActiveMobileIdx] = useState(() => {
    // Default to current user's column
    const idx = board.columns.findIndex(
      c => c.profile?.id === board.currentProfile.id
    )
    return idx >= 0 ? idx : 0
  })

  const dateStr = format(new Date(board.date + 'T12:00:00'), 'EEEE, d בMMMM yyyy', { locale: he })

  const handleCompletionChange = useCallback(() => {
    router.refresh()
  }, [router])

  useEffect(() => {
    const id = setInterval(() => router.refresh(), 15_000)
    return () => clearInterval(id)
  }, [router])

  const activeColumns = board.columns.filter(c => c.type !== 'placeholder')

  return (
    <div className="p-4 space-y-4" dir="rtl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">היום</h1>
        <p className="text-muted-foreground text-sm">{dateStr}</p>
      </div>

      {/* Tablet+: 5 columns grid, no scroll */}
      <div className="hidden md:grid md:grid-cols-3 gap-3 items-start">
        {board.columns.map((member, idx) => (
          <MemberColumn
            key={idx}
            member={member}
            currentProfile={board.currentProfile}
            onCompletionChange={handleCompletionChange}
          />
        ))}
      </div>

      {/* Mobile: tabs + single column */}
      <div className="md:hidden space-y-3">
        {/* Member tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {activeColumns.map((member, idx) => {
            const realIdx = board.columns.indexOf(member)
            const name = member.child?.name ?? member.profile?.display_name ?? 'עתידי'
            const color = member.child?.color ?? '#6366f1'
            const isActive = realIdx === activeMobileIdx
            return (
              <button
                key={realIdx}
                onClick={() => setActiveMobileIdx(realIdx)}
                className={`flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
                style={isActive ? { backgroundColor: color, borderColor: color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isActive ? 'white' : color }}
                />
                {name}
              </button>
            )
          })}
        </div>

        {/* Active column */}
        <MemberColumn
          member={board.columns[activeMobileIdx]}
          currentProfile={board.currentProfile}
          onCompletionChange={handleCompletionChange}
        />
      </div>
    </div>
  )
}
