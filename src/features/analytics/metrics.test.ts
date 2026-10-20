import { describe, expect, it } from 'vitest'

import { completedTasksOnDate, minutesByCategory, minutesByDateAndCategory, studyStreak, totalStudyMinutes, trendForDays, weeklyStudyMinutes } from '@/features/analytics/metrics'

describe('learning metrics', () => {
  it('calculates duration only from activity records', () => {
    const records = [
      { activity_date: '2026-10-18', category: 'java' as const, duration_minutes: 40 },
      { activity_date: '2026-10-18', category: 'ai' as const, duration_minutes: 20 },
    ]
    expect(totalStudyMinutes(records)).toBe(60)
    expect(minutesByCategory(records)).toEqual({ java: 40, ai: 20, research: 0, other: 0 })
  })

  it('counts task completion by completion timestamp in the owner timezone', () => {
    const tasks = [
      { status: 'done' as const, completed_at: '2026-10-17T17:30:00.000Z' },
      { status: 'todo' as const, completed_at: null },
      { status: 'todo' as const, completed_at: '2026-10-18T02:00:00.000Z' },
    ]
    expect(completedTasksOnDate(tasks, '2026-10-18', 'Asia/Shanghai')).toBe(2)
  })

  it('streak continues from today or yesterday without inventing a study day', () => {
    const records = [
      { activity_date: '2026-10-18', category: 'java' as const, duration_minutes: 10 },
      { activity_date: '2026-10-17', category: 'java' as const, duration_minutes: 10 },
      { activity_date: '2026-10-16', category: 'ai' as const, duration_minutes: 10 },
    ]
    expect(studyStreak(records, '2026-10-18')).toBe(3)
    expect(studyStreak(records, '2026-10-19')).toBe(3)
    expect(studyStreak(records, '2026-10-20')).toBe(0)
    expect(studyStreak([{ activity_date: '2026-10-18', category: 'java', duration_minutes: 0 }], '2026-10-18')).toBe(0)
  })

  it('builds zero-filled trends and weekly sums from activity dates', () => {
    const records = [{ activity_date: '2026-10-18', category: 'research' as const, duration_minutes: 35 }]
    expect(trendForDays(records, '2026-10-18', 7).at(-1)).toEqual({ date: '2026-10-18', minutes: 35 })
    expect(weeklyStudyMinutes(records, '2026-10-12')).toBe(35)
    expect(weeklyStudyMinutes(records, '2026-10-19')).toBe(0)
    expect(minutesByDateAndCategory(records).get('2026-10-18|research')).toBe(35)
  })
})
