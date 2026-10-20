import { requireSupabaseClient } from '@/lib/supabase'
import type { ActivityLogRow, DailyReviewRow, TablesInsert, TablesUpdate, WeeklyReviewRow } from '@/types/database'
import type { ActivityFormValues } from './activity-schema'

export type ActivityInput = Omit<ActivityFormValues, 'project_id'> & { project_id: string | null }
export type DailyReviewInput = Pick<DailyReviewRow, 'wins' | 'difficulties' | 'tomorrow_plan'>
export type ActivityDateReviewInput = DailyReviewInput

export async function listActivitiesByDate(date: string): Promise<ActivityLogRow[]> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_logs').select('*').eq('activity_date', date).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listAllActivities(): Promise<ActivityLogRow[]> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_logs').select('*').order('activity_date', { ascending: false }).order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listActivitiesRange(startDate: string, endDate: string): Promise<ActivityLogRow[]> {
  const { data, error } = await requireSupabaseClient()
    .from('activity_logs').select('*').gte('activity_date', startDate).lte('activity_date', endDate)
    .order('activity_date', { ascending: true }).order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createActivity(userId: string, input: ActivityInput): Promise<ActivityLogRow> {
  const payload: TablesInsert<'activity_logs'> = { user_id: userId, ...input }
  const { data, error } = await requireSupabaseClient().from('activity_logs').insert(payload).select('*').single()
  if (error) throw error
  return data
}

export async function updateActivity(id: string, input: ActivityInput): Promise<ActivityLogRow> {
  const payload: TablesUpdate<'activity_logs'> = input
  const { data, error } = await requireSupabaseClient().from('activity_logs').update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await requireSupabaseClient().from('activity_logs').delete().eq('id', id)
  if (error) throw error
}

export async function getDailyReview(date: string): Promise<DailyReviewRow | null> {
  const { data, error } = await requireSupabaseClient().from('daily_reviews').select('*').eq('review_date', date).maybeSingle()
  if (error) throw error
  return data
}

export async function saveDailyReview(userId: string, date: string, input: DailyReviewInput): Promise<DailyReviewRow> {
  const payload: TablesInsert<'daily_reviews'> = { user_id: userId, review_date: date, ...input }
  const { data, error } = await requireSupabaseClient()
    .from('daily_reviews').upsert(payload, { onConflict: 'user_id,review_date' }).select('*').single()
  if (error) throw error
  return data
}

export async function listWeeklyReviews(): Promise<WeeklyReviewRow[]> {
  const { data, error } = await requireSupabaseClient().from('weekly_reviews').select('*').order('week_start', { ascending: false })
  if (error) throw error
  return data
}

export async function getWeeklyReview(weekStart: string): Promise<WeeklyReviewRow | null> {
  const { data, error } = await requireSupabaseClient().from('weekly_reviews').select('*').eq('week_start', weekStart).maybeSingle()
  if (error) throw error
  return data
}

export async function saveWeeklyReview(userId: string, weekStart: string, input: Pick<WeeklyReviewRow, 'outcomes' | 'problems' | 'next_week_goals'>): Promise<WeeklyReviewRow> {
  const payload: TablesInsert<'weekly_reviews'> = { user_id: userId, week_start: weekStart, ...input }
  const { data, error } = await requireSupabaseClient().from('weekly_reviews').upsert(payload, { onConflict: 'user_id,week_start' }).select('*').single()
  if (error) throw error
  return data
}
