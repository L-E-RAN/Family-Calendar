import type { TodayBoardMember, Profile } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User } from 'lucide-react'
import ScoreSummary from './score-summary'
import ScreenTimeSummary from './screen-time-summary'
import TodayItemCard from './today-item-card'

const ROLE_LABELS: Record<string, string> = {
  family_admin: 'מנהל',
  parent: 'הורה',
  child: 'ילד/ה',
}

interface Props {
  member: TodayBoardMember
  currentProfile: Profile
  onCompletionChange: () => void
}

export default function MemberColumn({ member, currentProfile, onCompletionChange }: Props) {
  if (member.type === 'placeholder') {
    return (
      <div className="min-w-[200px] flex-1">
        <Card className="h-full border-dashed border-gray-200 bg-gray-50/50">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-5 h-5" />
              <span className="text-sm">עתידי</span>
            </div>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const name = member.child?.name ?? member.profile?.display_name ?? '—'
  const color = member.child?.color ?? '#6366f1'
  const role = member.profile?.role

  return (
    <div className="min-w-[220px] flex-1">
      <Card className="h-full">
        <CardHeader className="pb-3 pt-4 px-4 space-y-2">
          {/* Name + role */}
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: color }}
            >
              {name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{name}</p>
              {role && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 mt-0.5">
                  {ROLE_LABELS[role] || role}
                </Badge>
              )}
            </div>
          </div>

          {/* Score */}
          <ScoreSummary score={member.totalScore} />

          {/* Screen time (children only) */}
          {member.type === 'child' && member.child && (
            <ScreenTimeSummary
              earnedMinutes={member.earnedScreenMinutes}
              nextTierMinutes={member.nextTierMinutes}
              nextTierPointsNeeded={member.nextTierPointsNeeded}
              nextTierLabel={member.nextTierLabel}
            />
          )}
        </CardHeader>

        <CardContent className="px-4 pb-4 space-y-2">
          {member.items.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">ללא משימות להיום</p>
          ) : (
            member.items.map(boardItem => (
              <TodayItemCard
                key={boardItem.item.id}
                boardItem={boardItem}
                currentProfile={currentProfile}
                onCompletionChange={onCompletionChange}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
