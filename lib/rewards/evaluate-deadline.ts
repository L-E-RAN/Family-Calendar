import type { CalendarItem, CompletionStatus } from '@/types'

export interface DeadlineEvaluation {
  isPast: boolean
  isEndOfDayPast: boolean
  suggestedStatus: CompletionStatus
  pointsToAward: number
}

/**
 * Evaluates whether a deadline has passed for a reward-enabled item.
 * called_at is the moment of completion or evaluation.
 */
export function evaluateDeadline(
  item: CalendarItem,
  calledAt: Date,
  completionDate: string,
): DeadlineEvaluation {
  if (!item.reward_enabled || !item.deadline_time) {
    return {
      isPast: false,
      isEndOfDayPast: false,
      suggestedStatus: 'completed',
      pointsToAward: item.points_value,
    }
  }

  const [hours, minutes] = item.deadline_time.split(':').map(Number)
  const deadline = new Date(completionDate)
  deadline.setHours(hours, minutes, 0, 0)

  const endOfDay = new Date(completionDate)
  endOfDay.setHours(23, 59, 59, 999)

  const isPast = calledAt > deadline
  const isEndOfDayPast = calledAt > endOfDay

  if (!isPast) {
    return { isPast: false, isEndOfDayPast: false, suggestedStatus: 'completed', pointsToAward: item.points_value }
  }

  // Late but still same day — partial credit (0 by default, configurable via item)
  return {
    isPast: true,
    isEndOfDayPast,
    suggestedStatus: 'late',
    pointsToAward: 0,
  }
}
