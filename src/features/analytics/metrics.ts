import { addCalendarDays, dateKeyInTimezone, getWeekStart } from '@/lib/date-utils'
import type { StudyCategory, TaskStatus } from '@/types/database'

export type ActivityMetricRow = Pick<ActivityLogRow, 'activity_date' | 'category' | 'duration_minutes'>
export type TaskMetricRow = Pick<TaskMetricShape, 'status' | 'completed_at'>

type ActivityLogRow = { activity_date: string; category: StudyCategory; duration_minutes: number }
type TaskMetricShape = { status: TaskStatus; completed_at: string | null }

export type TrendPoint = { date: string; minutes: number }

export function totalStudyMinutes(activities: readonly ActivityMetricRow[]): number {
  return activities.reduce((total, activity) => total + activity.duration_minutes, 0)
}

export function minutesByCategory(activities: readonly ActivityMetricRow[]): Record<StudyCategory, number> {
  const result: Record<StudyCategory, number> = { java: 0, ai: 0, research: 0, other: 0 }
  for (const activity of activities) result[activity.category] += activity.duration_minutes
  return result
}

export function minutesByDate(activities: readonly ActivityMetricRow[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const activity of activities) result.set(activity.activity_date, (result.get(activity.activity_date) ?? 0) + activity.duration_minutes)
  return result
}

export function minutesByDateAndCategory(activities: readonly ActivityMetricRow[]): Map<string, number> {
  const result = new Map<string, number>()
  for (const activity of activities) {
    const key = `${activity.activity_date}|${activity.category}`
    result.set(key, (result.get(key) ?? 0) + activity.duration_minutes)
  }
  return result
}

export function completedTasksOnDate(tasks: readonly TaskMetricRow[], date: string, timezone: string): number {
  return tasks.filter((task) => task.completed_at !== null && dateKeyInTimezone(new Date(task.completed_at), timezone) === date).length
}

export function studyStreak(activities: readonly ActivityMetricRow[], today: string): number {
  const activeDates = new Set(activities.filter((activity) => activity.duration_minutes > 0).map((activity) => activity.activity_date))
  let current = activeDates.has(today) ? today : addCalendarDays(today, -1)
  if (!activeDates.has(current)) return 0
  let count = 0
  while (activeDates.has(current)) {
    count += 1
    current = addCalendarDays(current, -1)
  }
  return count
}

export function trendForDays(activities: readonly ActivityMetricRow[], today: string, days: 7 | 30 | 90): TrendPoint[] {
  const totals = minutesByDate(activities)
  return Array.from({ length: days }, (_, index) => {
    const date = addCalendarDays(today, index - days + 1)
    return { date, minutes: totals.get(date) ?? 0 }
  })
}

export function weeklyStudyMinutes(activities: readonly ActivityMetricRow[], weekStart: string): number {
  const endExclusive = addCalendarDays(weekStart, 7)
  return activities.reduce((sum, activity) => activity.activity_date >= weekStart && activity.activity_date < endExclusive ? sum + activity.duration_minutes : sum, 0)
}

export function weekCompletedTasks(tasks: readonly TaskMetricRow[], weekStart: string, timezone: string): number {
  const endExclusive = addCalendarDays(weekStart, 7)
  return tasks.filter((task) => task.completed_at !== null).filter((task) => {
    const date = dateKeyInTimezone(new Date(task.completed_at as string), timezone)
    return date >= weekStart && date < endExclusive
  }).length
}

export function recentWeekStarts(today: string, count: number): string[] {
  const currentWeek = getWeekStart(today)
  return Array.from({ length: count }, (_, index) => addCalendarDays(currentWeek, -7 * index))
}
