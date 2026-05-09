const TIMEZONE = 'Asia/Jerusalem'
const DAY_RESET_HOUR = 22

// Returns the "logical date" string (YYYY-MM-DD in Israel tz).
// After 22:00 Israel time, shifts to tomorrow so the new day starts at 22:00.
export function getLogicalDateString(): string {
  const now = new Date()
  const hour = parseInt(
    now.toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour12: false }).slice(0, 2)
  )
  const base = hour >= DAY_RESET_HOUR
    ? new Date(now.getTime() + 24 * 60 * 60 * 1000)
    : now
  return base.toLocaleDateString('en-CA', { timeZone: TIMEZONE })
}

// Returns a Date object shifted +24h when past 22:00, for use with startOfDay/endOfDay.
export function getLogicalDate(): Date {
  const now = new Date()
  const hour = parseInt(
    now.toLocaleTimeString('en-GB', { timeZone: TIMEZONE, hour12: false }).slice(0, 2)
  )
  if (hour >= DAY_RESET_HOUR) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
  return now
}
