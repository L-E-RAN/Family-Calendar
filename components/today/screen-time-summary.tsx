import { Monitor } from 'lucide-react'

interface Props {
  earnedMinutes: number
  nextTierMinutes: number | null
  nextTierPointsNeeded: number | null
  nextTierLabel: string | null
}

export default function ScreenTimeSummary({
  earnedMinutes,
  nextTierMinutes,
  nextTierPointsNeeded,
  nextTierLabel,
}: Props) {
  const hours = Math.floor(earnedMinutes / 60)
  const mins = earnedMinutes % 60
  const timeLabel = hours > 0 ? `${hours}ש׳ ${mins > 0 ? `${mins}ד׳` : ''}` : `${mins}ד׳`

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
        <Monitor className="w-4 h-4" />
        <span>זמן מסך: {earnedMinutes > 0 ? timeLabel : 'טרם הושג'}</span>
      </div>
      {nextTierPointsNeeded !== null && (
        <p className="text-xs text-muted-foreground pr-5">
          עוד {nextTierPointsNeeded} נק׳ למדרגה הבאה
          {nextTierLabel ? ` (${nextTierLabel})` : ''}
          {nextTierMinutes ? ` — ${nextTierMinutes}ד׳` : ''}
        </p>
      )}
    </div>
  )
}
