/**
 * Given a completed-at date and a repeat_rule string, return the next due date.
 * repeat_rule format: "<n> <unit>" where unit is days|weeks|months|years
 * Examples: "30 days", "3 months", "1 year"
 */
export function calcNextDue(completedAt: Date, repeatRule: string): Date | null {
  const match = repeatRule.trim().match(/^(\d+)\s+(day|days|week|weeks|month|months|year|years)$/)
  if (!match) return null

  const amount = parseInt(match[1], 10)
  const unit = match[2]
  const next = new Date(completedAt)

  if (unit.startsWith('day')) next.setDate(next.getDate() + amount)
  else if (unit.startsWith('week')) next.setDate(next.getDate() + amount * 7)
  else if (unit.startsWith('month')) next.setMonth(next.getMonth() + amount)
  else if (unit.startsWith('year')) next.setFullYear(next.getFullYear() + amount)

  return next
}
