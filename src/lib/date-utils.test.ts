import { describe, expect, it } from 'vitest'

import { addCalendarDays, dateKeyInTimezone, getWeekStart } from '@/lib/date-utils'

describe('calendar date helpers', () => {
  it('formats a date using the configured timezone', () => {
    expect(dateKeyInTimezone(new Date('2026-10-17T17:00:00.000Z'))).toBe('2026-10-18')
    expect(dateKeyInTimezone(new Date('2026-10-17T16:00:00.000Z'))).toBe('2026-10-18')
  })

  it('keeps local dates stable across a daylight-saving clock change', () => {
    expect(dateKeyInTimezone(new Date('2026-03-08T09:59:00.000Z'), 'America/Los_Angeles')).toBe('2026-03-08')
    expect(dateKeyInTimezone(new Date('2026-03-08T10:00:00.000Z'), 'America/Los_Angeles')).toBe('2026-03-08')
  })

  it('uses Monday as the first day of a natural week', () => {
    expect(getWeekStart('2026-10-18')).toBe('2026-10-12')
    expect(getWeekStart('2026-10-19')).toBe('2026-10-19')
  })

  it('adds calendar days without local timezone drift', () => {
    expect(addCalendarDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(getWeekStart('2027-01-01')).toBe('2026-12-28')
  })
})
