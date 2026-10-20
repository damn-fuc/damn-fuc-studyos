export const DEFAULT_TIMEZONE = 'Asia/Shanghai'

export function dateKeyInTimezone(date: Date, timezone = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values['year']}-${values['month']}-${values['day']}`
}

export function getWeekStart(dateKey: string): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`)
  const day = date.getUTCDay()
  date.setUTCDate(date.getUTCDate() - ((day + 6) % 7))
  return date.toISOString().slice(0, 10)
}

export function addCalendarDays(dateKey: string, amount: number): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

export function formatDate(dateKey: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(`${dateKey}T12:00:00.000Z`)
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'UTC',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(date)
}
