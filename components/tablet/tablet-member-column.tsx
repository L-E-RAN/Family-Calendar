'use client'

import { useState } from 'react'
import type { TodayBoardMember, TodayBoardItem } from '@/types'
import TabletTaskDialog from './tablet-task-dialog'
import ScoreSummary from '@/components/today/score-summary'
import ScreenTimeSummary from '@/components/today/screen-time-summary'
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

const SOURCE_TYPE_LABELS: Record<string, string> = {
  task: 'משימה',
  homework: 'שיעורי בית',
  lesson: 'שיעור',
  exam: 'מבחן',
  event: 'אירוע',
  parent_approval: 'אישור הורים',
}

interface Props {
  member: TodayBoardMember
  onCompletionChange: () => void
}

function TaskRow({ boardItem, onClick }: { boardItem: TodayBoardItem; onClick: () => void }) {
  const { item, completion } = boardItem
  const status = completion?.status ?? 'pending'
  const isDone = ['completed', 'approved', 'late', 'missed'].includes(status)
  const isPendingApproval = status === 'completed_pending_approval'

  return (
    <button
      onClick={onClick}
      className={`w-full text-right rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors active:scale-[0.98] ${
        isDone
          ? 'bg-gray-50 border-gray-200 opacity-60'
          : isPendingApproval
            ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
            : 'bg-white border-gray-200 hover:bg-gray-50'
      }`}
    >
      {/* Status icon */}
      <div className="shrink-0">
        {isDone
          ? <CheckCircle2 className="w-6 h-6 text-green-500" />
          : isPendingApproval
            ? <AlertCircle className="w-6 h-6 text-yellow-500" />
            : <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
        }
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-sm leading-snug ${isDone ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {item.subject || item.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
          <span>{SOURCE_TYPE_LABELS[item.source_type] || item.source_type}</span>
          {item.deadline_time && (
            <span className="text-orange-500 font-medium">עד {item.deadline_time.slice(0, 5)}</span>
          )}
          {item.starts_at && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {format(new Date(item.starts_at), 'HH:mm')}
            </span>
          )}
          {item.reward_enabled && item.points_value > 0 && !isDone && (
            <span className="text-green-600 font-medium">+{item.points_value} נק׳</span>
          )}
          {(completion?.points_awarded ?? 0) > 0 && isDone && (
            <span className="text-green-600">+{completion!.points_awarded} נק׳</span>
          )}
        </div>
      </div>

      {/* Chevron hint */}
      {!isDone && (
        <div className="shrink-0 text-gray-300 text-lg">›</div>
      )}
    </button>
  )
}

export default function TabletMemberColumn({ member, onCompletionChange }: Props) {
  const [selectedItem, setSelectedItem] = useState<TodayBoardItem | null>(null)
  const name = member.child?.name ?? member.profile?.display_name ?? '—'
  const color = member.child?.color ?? '#6366f1'
  const isChild = member.type === 'child' && !!member.child

  const pendingCount = member.items.filter(i =>
    !i.completion || i.completion.status === 'pending' || i.completion.status === 'rejected'
  ).length

  return (
    <>
      <div className="flex flex-col rounded-2xl border-2 bg-white shadow-sm overflow-hidden" style={{ borderColor: color }}>
        {/* Column header */}
        <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: color + '20' }}>
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ backgroundColor: color }}
          >
            {name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-base truncate">{name}</p>
            {pendingCount > 0
              ? <p className="text-xs text-gray-500">{pendingCount} משימות נותרו</p>
              : <p className="text-xs text-green-600 font-medium">הכל בוצע! 🎉</p>
            }
          </div>
        </div>

        {/* Score + screen time */}
        <div className="px-4 py-2 border-b bg-gray-50 space-y-1">
          <ScoreSummary score={member.totalScore} />
          {isChild && (
            <ScreenTimeSummary
              earnedMinutes={member.earnedScreenMinutes}
              nextTierMinutes={member.nextTierMinutes}
              nextTierPointsNeeded={member.nextTierPointsNeeded}
              nextTierLabel={member.nextTierLabel}
            />
          )}
        </div>

        {/* Items list */}
        <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[60vh]">
          {member.items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">אין משימות להיום</p>
          ) : (
            member.items.map(boardItem => (
              <TaskRow
                key={boardItem.item.id}
                boardItem={boardItem}
                onClick={() => setSelectedItem(boardItem)}
              />
            ))
          )}
        </div>
      </div>

      {/* Task dialog */}
      {selectedItem && (
        <TabletTaskDialog
          boardItem={selectedItem}
          targetChildId={member.child?.id ?? null}
          childName={name}
          childColor={color}
          onCompletionChange={onCompletionChange}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  )
}
