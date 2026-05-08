import type { ScreenTimeRewardTier } from '@/types'

export interface ScreenTimeResult {
  earnedMinutes: number
  currentTier: ScreenTimeRewardTier | null
  nextTier: ScreenTimeRewardTier | null
  pointsNeededForNext: number | null
}

export function calculateScreenTime(
  score: number,
  tiers: ScreenTimeRewardTier[],
): ScreenTimeResult {
  const sorted = [...tiers].sort((a, b) => a.min_points - b.min_points)

  let currentTier: ScreenTimeRewardTier | null = null
  let nextTier: ScreenTimeRewardTier | null = null

  for (let i = 0; i < sorted.length; i++) {
    if (score >= sorted[i].min_points) {
      currentTier = sorted[i]
    } else if (!nextTier) {
      nextTier = sorted[i]
    }
  }

  return {
    earnedMinutes: currentTier?.screen_time_minutes ?? 0,
    currentTier,
    nextTier,
    pointsNeededForNext: nextTier ? nextTier.min_points - score : null,
  }
}
