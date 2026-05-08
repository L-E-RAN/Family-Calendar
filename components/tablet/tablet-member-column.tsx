import type { TodayBoardMember, Profile } from '@/types'
import TabletItemCard from './tablet-item-card'
import ScoreSummary from '@/components/today/score-summary'
import ScreenTimeSummary from '@/components/today/screen-time-summary'

interface Props {
  member: TodayBoardMember
  onCompletionChange: () => void
}

export default function TabletMemberColumn({ member, onCompletionChange }: Props) {
  const name = member.child?.name ?? member.profile?.display_name ?? '—'
  const color = member.child?.color ?? '#6366f1'
  const isChild = member.type === 'child' && !!member.child

  const pendingCount = member.items.filter(i =>
    !i.completion || i.completion.status === 'pending' || i.completion.status === 'rejected'
  ).length

  return (
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
          {pendingCount > 0 && (
            <p className="text-xs text-gray-500">{pendingCount} משימות נותרו</p>
          )}
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

      {/* Items */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[60vh]">
        {member.items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-6">אין משימות להיום</p>
        ) : (
          member.items.map(boardItem => (
            <TabletItemCard
              key={boardItem.item.id}
              boardItem={boardItem}
              targetChildId={member.child?.id ?? null}
              onCompletionChange={onCompletionChange}
            />
          ))
        )}
      </div>
    </div>
  )
}
