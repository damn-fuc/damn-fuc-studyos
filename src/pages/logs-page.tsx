import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { BookOpenText, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { ErrorState } from '@/components/feedback/error-state'
import { EmptyState } from '@/components/feedback/empty-state'
import { LoadingState } from '@/components/feedback/loading-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/auth-provider'
import { ActivityFormDialog } from '@/features/logs/activity-form-dialog'
import { createActivity, deleteActivity, getDailyReview, listActivitiesByDate, saveDailyReview, updateActivity, type ActivityInput, type DailyReviewInput } from '@/features/logs/logs-api'
import { listProjects } from '@/features/projects/projects-api'
import { getUserSettings } from '@/features/settings/settings-api'
import { DEFAULT_TIMEZONE } from '@/lib/date-utils'
import { useNow } from '@/hooks/use-now'
import { addCalendarDays, dateKeyInTimezone, formatDate } from '@/lib/date-utils'
import { queryKeys } from '@/lib/query-keys'
import type { ActivityLogRow } from '@/types/database'

const reviewSchema = z.object({ wins: z.string().max(5000), difficulties: z.string().max(5000), tomorrow_plan: z.string().max(5000) })
type ReviewValues = z.infer<typeof reviewSchema>
const categoryLabels = { java: 'Java', ai: 'AI / Python', research: '科研', other: '其他' } as const
const categoryColors = { java: 'bg-amber-500', ai: 'bg-violet-500', research: 'bg-teal-600', other: 'bg-slate-400' } as const
const emptyActivities: ActivityLogRow[] = []

function DailyReviewEditor({ userId, date }: { userId: string; date: string }) {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: queryKeys.dailyReview(userId, date), queryFn: () => getDailyReview(date), enabled: Boolean(userId) })
  const form = useForm<ReviewValues>({ resolver: zodResolver(reviewSchema), defaultValues: { wins: '', difficulties: '', tomorrow_plan: '' } })
  const mutation = useMutation({
    mutationFn: (input: DailyReviewInput) => saveDailyReview(userId, date, input),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: queryKeys.dailyReview(userId, date) }); toast.success('每日复盘已保存') },
    onError: () => toast.error('每日复盘保存失败，请检查网络后重试。'),
  })

  useEffect(() => {
    const row = query.data
    form.reset({ wins: row?.wins ?? '', difficulties: row?.difficulties ?? '', tomorrow_plan: row?.tomorrow_plan ?? '' })
  }, [form, query.data])

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">每日复盘</CardTitle><CardDescription>{formatDate(date, { year: 'numeric' })} · 今日收获、困难与明日计划</CardDescription></CardHeader>
      <CardContent>
        {query.isError ? <ErrorState description="复盘内容暂时无法读取。" onRetry={() => void query.refetch()} /> : null}
        {query.isPending ? <LoadingState label="正在加载每日复盘" rows={2} /> : null}
        {!query.isPending && !query.isError ? <form className="space-y-4" noValidate onSubmit={form.handleSubmit(async (value) => mutation.mutateAsync(value))}>
          <label className="block space-y-1.5 text-sm font-medium">今日收获<Textarea maxLength={5000} placeholder="今天完成了什么、学会了什么？" {...form.register('wins')} /></label>
          <label className="block space-y-1.5 text-sm font-medium">遇到的困难<Textarea maxLength={5000} placeholder="记录卡点，方便之后继续处理。" {...form.register('difficulties')} /></label>
          <label className="block space-y-1.5 text-sm font-medium">明日计划<Textarea maxLength={5000} placeholder="写下明天最重要的下一步。" {...form.register('tomorrow_plan')} /></label>
          <Button disabled={mutation.isPending || !form.formState.isDirty} type="submit">{mutation.isPending ? '正在保存…' : '保存每日复盘'}</Button>
        </form> : null}
      </CardContent>
    </Card>
  )
}

export function LogsPage() {
  const now = useNow()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const settingsQuery = useQuery({ queryKey: queryKeys.settings(userId), queryFn: getUserSettings, enabled: Boolean(userId) })
  const today = dateKeyInTimezone(now, settingsQuery.data?.timezone ?? DEFAULT_TIMEZONE)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const date = selectedDate ?? today
  const setDate = (next: string | ((previous: string) => string)) => setSelectedDate(typeof next === 'function' ? next(date) : next)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const isQuickCreateRequested = searchParams.get('new') === '1'
  const dialogOpen = isFormOpen || isQuickCreateRequested
  const [editingActivity, setEditingActivity] = useState<ActivityLogRow | null>(null)

  function clearQuickCreateRequest() {
    if (!isQuickCreateRequested) return
    const next = new URLSearchParams(searchParams)
    next.delete('new')
    setSearchParams(next, { replace: true })
  }

  const activitiesQuery = useQuery({ queryKey: queryKeys.activitiesForDate(userId, date), queryFn: () => listActivitiesByDate(date), enabled: Boolean(userId) })
  const projectsQuery = useQuery({ queryKey: queryKeys.projects(userId), queryFn: listProjects, enabled: Boolean(userId) })
  const invalidate = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ['activities', userId] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
    queryClient.invalidateQueries({ queryKey: ['analytics', userId] }),
  ])
  const saveMutation = useMutation({
    mutationFn: ({ activity, input }: { activity: ActivityLogRow | null; input: ActivityInput }) => activity ? updateActivity(activity.id, input) : createActivity(userId, input),
    onSuccess: async (_row, { activity }) => { await invalidate(); setIsFormOpen(false); setEditingActivity(null); clearQuickCreateRequest(); toast.success(activity ? '学习记录已更新' : '学习记录已保存') },
    onError: () => toast.error('学习记录保存失败，请检查网络后重试。'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteActivity,
    onSuccess: async () => { await invalidate(); toast.success('学习记录已删除') },
    onError: () => toast.error('删除失败，请检查网络后重试。'),
  })
  const activities = activitiesQuery.data ?? emptyActivities
  const totalMinutes = activities.reduce((sum, activity) => sum + activity.duration_minutes, 0)
  const categoryTotals = useMemo(() => activities.reduce<Record<string, number>>((totals, activity) => {
    totals[activity.category] = (totals[activity.category] ?? 0) + activity.duration_minutes
    return totals
  }, {}), [activities])
  const projectMap = useMemo(() => new Map((projectsQuery.data ?? []).map((project) => [project.id, project.name])), [projectsQuery.data])
  const openCreate = () => { setEditingActivity(null); setIsFormOpen(true) }
  const confirmDelete = (row: ActivityLogRow) => { if (window.confirm(`确定删除“${row.title}”这条学习记录吗？此操作无法撤销。`)) deleteMutation.mutate(row.id) }

  return (
    <div className="space-y-5">
      <PageHeader description="按日期记录活动、投入时长和 Markdown 笔记。学习时长仅由活动记录计算。" title="学习日志" actions={<Button onClick={openCreate} size="sm"><Plus aria-hidden="true" className="size-4" />记录学习</Button>} />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3">
        <div className="flex items-center gap-1"><Button aria-label="前一天" onClick={() => setDate((value) => addCalendarDays(value, -1))} size="icon-sm" variant="ghost"><ChevronLeft aria-hidden="true" className="size-4" /></Button><Input aria-label="选择记录日期" className="w-40" onChange={(event) => setDate(event.target.value)} type="date" value={date} /><Button aria-label="后一天" disabled={date >= today} onClick={() => setDate((value) => addCalendarDays(value, 1))} size="icon-sm" variant="ghost"><ChevronRight aria-hidden="true" className="size-4" /></Button></div>
        <div className="flex items-center gap-3"><div className="text-right"><p className="text-lg font-semibold tabular-nums">{totalMinutes < 60 ? `${totalMinutes} 分钟` : `${Math.floor(totalMinutes / 60)} 小时 ${totalMinutes % 60} 分`}</p><p className="text-xs text-muted-foreground">当日学习时长</p></div><Button onClick={() => setDate(today)} size="sm" variant="outline">今天</Button></div>
      </div>
      {totalMinutes > 0 ? <div className="flex flex-wrap gap-2">{Object.entries(categoryTotals).map(([category, minutes]) => <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs" key={category}><span className={`size-2 rounded-full ${categoryColors[category as keyof typeof categoryColors] ?? categoryColors.other}`} />{categoryLabels[category as keyof typeof categoryLabels] ?? '其他'} · {minutes} 分钟</span>)}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.85fr)]">
        <section className="space-y-3" aria-label="当天学习活动">
          <div className="flex items-baseline justify-between"><h2 className="text-base font-semibold">{formatDate(date, { year: 'numeric', weekday: 'long' })}</h2><span className="text-xs text-muted-foreground">{activities.length} 条活动</span></div>
          {activitiesQuery.isPending ? <LoadingState label="正在加载学习记录" rows={3} /> : null}
          {activitiesQuery.isError ? <ErrorState description="学习记录暂时无法读取。" onRetry={() => void activitiesQuery.refetch()} /> : null}
          {activitiesQuery.isSuccess && activities.length === 0 ? <EmptyState actionLabel="记录一条活动" description="支持历史补录。每条活动都有单独时长，任务完成不会自动增加学习时间。" icon={<BookOpenText aria-hidden="true" className="size-5" />} onAction={openCreate} title="这一天还没有学习记录" /> : null}
          {activities.map((activity) => <Card key={activity.id}><CardContent className="p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{activity.title}</h3><span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{categoryLabels[activity.category]}</span></div><p className="mt-1 text-xs text-muted-foreground">{activity.duration_minutes} 分钟{activity.project_id && projectMap.has(activity.project_id) ? ` · ${projectMap.get(activity.project_id)}` : ''}</p></div><div className="flex shrink-0 gap-1"><Button aria-label={`编辑 ${activity.title}`} onClick={() => { setEditingActivity(activity); setIsFormOpen(true) }} size="icon-sm" variant="ghost"><Pencil aria-hidden="true" className="size-4" /></Button><Button aria-label={`删除 ${activity.title}`} onClick={() => confirmDelete(activity)} size="icon-sm" variant="ghost"><Trash2 aria-hidden="true" className="size-4" /></Button></div></div>
            {activity.content ? <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{activity.content}</p> : null}
            {activity.notes ? <div className="mt-3 border-l-2 pl-3 text-sm leading-6 text-muted-foreground"><p className="whitespace-pre-wrap break-words">{activity.notes}</p></div> : null}
          </CardContent></Card>)}
        </section>
        <DailyReviewEditor date={date} key={date} userId={userId} />
      </div>

      <ActivityFormDialog activity={editingActivity} date={date} isSaving={saveMutation.isPending} onOpenChange={(open) => { setIsFormOpen(open); if (!open) { setEditingActivity(null); clearQuickCreateRequest() } }} onSave={async (input) => { await saveMutation.mutateAsync({ activity: editingActivity, input }) }} open={dialogOpen} projects={projectsQuery.data ?? []} />
    </div>
  )
}
