import type { DailyItemCompletion } from '@/types'

export function calculateScore(completions: DailyItemCompletion[]): number {
  return completions.reduce((sum, c) => {
    return sum + c.points_awarded - c.penalty_applied
  }, 0)
}
