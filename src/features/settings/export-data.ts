import { requireSupabaseClient } from '@/lib/supabase'

export async function exportAllData(userId: string) {
  const client = requireSupabaseClient()
  const [projects, milestones, tasks, activityLogs, dailyReviews, weeklyReviews, userSettings] = await Promise.all([
    client.from('projects').select('*').order('created_at', { ascending: true }),
    client.from('milestones').select('*').order('created_at', { ascending: true }),
    client.from('tasks').select('*').order('created_at', { ascending: true }),
    client.from('activity_logs').select('*').order('activity_date', { ascending: true }).order('created_at', { ascending: true }),
    client.from('daily_reviews').select('*').order('review_date', { ascending: true }),
    client.from('weekly_reviews').select('*').order('week_start', { ascending: true }),
    client.from('user_settings').select('*').maybeSingle(),
  ])
  const result = [projects, milestones, tasks, activityLogs, dailyReviews, weeklyReviews, userSettings]
  const failure = result.find((item) => item.error)
  if (failure?.error) throw failure.error
  return {
    format_version: 1,
    exported_at: new Date().toISOString(),
    user_id: userId,
    projects: projects.data ?? [],
    milestones: milestones.data ?? [],
    tasks: tasks.data ?? [],
    activity_logs: activityLogs.data ?? [],
    daily_reviews: dailyReviews.data ?? [],
    weekly_reviews: weeklyReviews.data ?? [],
    user_settings: userSettings.data,
  }
}

type ExportData = Awaited<ReturnType<typeof exportAllData>>
type ExportTableName = Exclude<keyof ExportData, 'format_version' | 'exported_at' | 'user_id'>

export function serializeExportCsv(data: ExportData): string {
  const tables: [ExportTableName, readonly Record<string, unknown>[]][] = [
    ['projects', data.projects], ['milestones', data.milestones], ['tasks', data.tasks],
    ['activity_logs', data.activity_logs], ['daily_reviews', data.daily_reviews],
    ['weekly_reviews', data.weekly_reviews], ['user_settings', data.user_settings ? [data.user_settings] : []],
  ]
  const fieldNames = [...new Set(tables.flatMap(([, rows]) => rows.flatMap((row) => Object.keys(row))))]
  const headers = ['table_name', ...fieldNames]
  const escape = (value: unknown): string => {
    let text = value === null || value === undefined ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  const rows = tables.flatMap(([name, records]) => records.map((record) => [name, ...fieldNames.map((field) => record[field])]))
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
