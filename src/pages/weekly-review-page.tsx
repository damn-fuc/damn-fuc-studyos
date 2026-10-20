import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { CalendarCheck, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { ErrorState } from '@/components/feedback/error-state'
import { LoadingState } from '@/components/feedback/loading-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/auth-provider'
import { useNow } from '@/hooks/use-now'
import { weekCompletedTasks, weeklyStudyMinutes } from '@/features/analytics/metrics'
import { listActivitiesRange, getWeeklyReview, listWeeklyReviews, saveWeeklyReview } from '@/features/logs/logs-api'
import { getUserSettings } from '@/features/settings/settings-api'
import { listTasks } from '@/features/tasks/tasks-api'
import { addCalendarDays, dateKeyInTimezone, DEFAULT_TIMEZONE, formatDate, getWeekStart } from '@/lib/date-utils'
import { queryKeys } from '@/lib/query-keys'
import type { TaskRow } from '@/types/database'

const reviewSchema = z.object({ outcomes: z.string().max(10000), problems: z.string().max(10000), next_week_goals: z.string().max(10000) })
type ReviewValues = z.infer<typeof reviewSchema>

function CompletedTaskList({ tasks, timezone, weekStart }: { tasks: TaskRow[]; timezone: string; weekStart: string }) {
  const end = addCalendarDays(weekStart, 7)
  const completed = tasks.filter((task) => task.completed_at !== null && dateKeyInTimezone(new Date(task.completed_at), timezone) >= weekStart && dateKeyInTimezone(new Date(task.completed_at), timezone) < end)
  return completed.length > 0
    ? <ul className="space-y-2">{completed.map((task) => <li className="flex items-start gap-2 text-sm" key={task.id}><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-500" /><span>{task.title}</span></li>)}</ul>
    : <p className="text-sm text-muted-foreground">这周还没有完成任务记录。</p>
}

export function WeeklyReviewPage() {
  const now = useNow()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: queryKeys.settings(userId), queryFn: getUserSettings, enabled: Boolean(userId) })
  const timezone = settingsQuery.data?.timezone ?? DEFAULT_TIMEZONE
  const today = dateKeyInTimezone(now, timezone)
  const currentWeek = getWeekStart(today)
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null)
  const weekStart = selectedWeek ?? currentWeek
  const weekEnd = addCalendarDays(weekStart, 6)
  const weekActivityQuery = useQuery({ queryKey: queryKeys.activityRange(userId, weekStart, weekEnd), queryFn: () => listActivitiesRange(weekStart, weekEnd), enabled: Boolean(userId) })
  const tasksQuery = useQuery({ queryKey: queryKeys.tasks(userId), queryFn: listTasks, enabled: Boolean(userId) })
  const reviewQuery = useQuery({ queryKey: queryKeys.weeklyReview(userId, weekStart), queryFn: () => getWeeklyReview(weekStart), enabled: Boolean(userId) })
  const historyQuery = useQuery({ queryKey: queryKeys.weeklyReviews(userId), queryFn: listWeeklyReviews, enabled: Boolean(userId) })
  const form = useForm<ReviewValues>({ resolver: zodResolver(reviewSchema), defaultValues: { outcomes: '', problems: '', next_week_goals: '' } })
  const saveMutation = useMutation({
    mutationFn: (input: ReviewValues) => saveWeeklyReview(userId, weekStart, input),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReview(userId, weekStart) }), queryClient.invalidateQueries({ queryKey: queryKeys.weeklyReviews(userId) })]); toast.success('周复盘已保存') },
    onError: () => toast.error('周复盘保存失败，请检查网络后重试。'),
  })
  useEffect(() => {
    const row = reviewQuery.data
    form.reset({ outcomes: row?.outcomes ?? '', problems: row?.problems ?? '', next_week_goals: row?.next_week_goals ?? '' })
  }, [form, reviewQuery.data, weekStart])

  const activities = weekActivityQuery.data ?? []
  const tasks = tasksQuery.data ?? []
  const minutes = weeklyStudyMinutes(activities, weekStart)
  const completedCount = weekCompletedTasks(tasks, weekStart, timezone)
  const weeklyGoal = settingsQuery.data?.weekly_goal_minutes ?? 600
  const savedWeeks = useMemo(() => historyQuery.data ?? [], [historyQuery.data])
  const isLoading = weekActivityQuery.isPending || tasksQuery.isPending || reviewQuery.isPending || historyQuery.isPending
  const hasError = weekActivityQuery.isError || tasksQuery.isError || reviewQuery.isError || historyQuery.isError

  function changeWeek(date: string) { if (date) setSelectedWeek(getWeekStart(date)) }

  return <div className="space-y-5">
    <PageHeader description="每周自动汇总真实活动时长与任务完成事项，再补充成果、问题和下周目标。" title="每周复盘" />
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1"><Button aria-label="上一周" onClick={() => setSelectedWeek(addCalendarDays(weekStart, -7))} size="icon-sm" variant="ghost"><ChevronLeft aria-hidden="true" className="size-4" /></Button><label className="sr-only" htmlFor="weekly-start">选择周</label><Input className="w-40" id="weekly-start" onChange={(event) => changeWeek(event.target.value)} type="date" value={weekStart} /><Button aria-label="下一周" disabled={weekStart >= currentWeek} onClick={() => setSelectedWeek(addCalendarDays(weekStart, 7))} size="icon-sm" variant="ghost"><ChevronRight aria-hidden="true" className="size-4" /></Button><Button disabled={weekStart === currentWeek} onClick={() => setSelectedWeek(currentWeek)} size="sm" variant="outline">本周</Button></div>
      <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">历史周报</span><select aria-label="选择历史周报" className="h-9 max-w-48 rounded-lg border border-input bg-background px-3 text-sm" onChange={(event) => setSelectedWeek(event.target.value)} value={weekStart}><option value={currentWeek}>{formatDate(currentWeek, { year: 'numeric' })}（本周）</option>{savedWeeks.filter((row) => row.week_start !== currentWeek).map((row) => <option key={row.id} value={row.week_start}>{formatDate(row.week_start, { year: 'numeric' })}</option>)}</select></div>
    </div>
    <p className="text-sm text-muted-foreground">{formatDate(weekStart, { year: 'numeric', month: 'long', day: 'numeric' })} – {formatDate(weekEnd, { year: 'numeric', month: 'long', day: 'numeric' })} · 周一至周日</p>
    {settingsQuery.isError ? <ErrorState description="时区与学习目标暂时无法读取，当前使用北京时间及 600 分钟默认目标。" onRetry={() => void settingsQuery.refetch()} /> : null}
    {isLoading ? <LoadingState label="正在汇总周报数据" rows={4} /> : null}
    {hasError ? <ErrorState description="周报或自动汇总数据暂时无法读取。" onRetry={() => { void weekActivityQuery.refetch(); void tasksQuery.refetch(); void reviewQuery.refetch(); void historyQuery.refetch() }} /> : null}
    {!isLoading && !hasError ? <>
      <div className="grid gap-4 md:grid-cols-2"><Card><CardContent className="flex items-center justify-between gap-3 p-5"><div><p className="text-sm text-muted-foreground">本周学习时长</p><p className="mt-1 text-2xl font-semibold tabular-nums">{minutes}<span className="ml-1 text-sm font-normal text-muted-foreground">分钟</span></p><p className="mt-1 text-xs text-muted-foreground">目标 {weeklyGoal} 分钟</p></div><Badge variant={minutes >= weeklyGoal && weeklyGoal > 0 ? 'default' : 'secondary'}>{weeklyGoal > 0 ? `${Math.min(100, Math.round(minutes / weeklyGoal * 100))}%` : '无目标'}</Badge></CardContent></Card><Card><CardContent className="flex items-center justify-between gap-3 p-5"><div><p className="text-sm text-muted-foreground">完成事项</p><p className="mt-1 text-2xl font-semibold tabular-nums">{completedCount}<span className="ml-1 text-sm font-normal text-muted-foreground">项</span></p><p className="mt-1 text-xs text-muted-foreground">依据任务完成时间汇总</p></div><CalendarCheck aria-hidden="true" className="size-6 text-emerald-500" /></CardContent></Card></div>
      <div className="grid gap-4 xl:grid-cols-2"><Card><CardHeader><CardTitle className="text-base">本周完成事项</CardTitle><CardDescription>按任务在 {timezone} 的完成时间统计。</CardDescription></CardHeader><CardContent><CompletedTaskList tasks={tasks} timezone={timezone} weekStart={weekStart} /></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">周复盘</CardTitle><CardDescription>{reviewQuery.data ? `最近更新于 ${new Date(reviewQuery.data.updated_at).toLocaleString('zh-CN', { timeZone: timezone })}` : '本周还没有保存的复盘内容。'}</CardDescription></CardHeader><CardContent><form className="space-y-4" noValidate onSubmit={form.handleSubmit(async (value) => saveMutation.mutateAsync(value))}>
          <label className="block space-y-1.5 text-sm font-medium">本周成果<Textarea className="min-h-24" maxLength={10000} placeholder="完成了什么？取得了哪些进展？" {...form.register('outcomes')} /></label>
          <label className="block space-y-1.5 text-sm font-medium">问题与反思<Textarea className="min-h-24" maxLength={10000} placeholder="哪些地方卡住了，原因是什么？" {...form.register('problems')} /></label>
          <label className="block space-y-1.5 text-sm font-medium">下周目标<Textarea className="min-h-24" maxLength={10000} placeholder="写下下周希望完成的具体事项。" {...form.register('next_week_goals')} /></label>
          <Button disabled={saveMutation.isPending || !form.formState.isDirty} type="submit">{saveMutation.isPending ? '正在保存…' : '保存周复盘'}</Button>
        </form></CardContent></Card></div>
    </> : null}
  </div>
}
