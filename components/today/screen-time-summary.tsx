'use client'

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
  // Screen time resets daily at 22:00 — after that, today's time has expired
  const expired = new Date().getHours() >= 22
  const effectiveMinutes = expired ? 0 : earnedMinutes

  const hours = Math.floor(effectiveMinutes / 60)
  const mins = effectiveMinutes % 60
  const timeLabel = hours > 0 ? `${hours}ש׳ ${mins > 0 ? `${mins}ד׳` : ''}` : `${mins}ד׳`

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600">
        <Monitor className="w-4 h-4" />
        {expired ? (
          <span className="text-gray-400">זמן מסך: פג תוקף (מתאפס מחר)</span>
        ) : (
          <span>זמן מסך שקיבלת: {effectiveMinutes > 0 ? `${effectiveMinutes} דקות` : 'טרם הושג'}</span>
        )}
      </div>
      {!expired && nextTierPointsNeeded !== null && nextTierMinutes !== null && (
        <p className="text-xs text-green-600 font-medium pr-5">
          עוד {nextTierPointsNeeded} נקודות תקבל עוד {nextTierMinutes - earnedMinutes} דקות מסך{nextTierLabel ? ` (${nextTierLabel})` : ''}!
        </p>
      )}
    </div>
  )
}
