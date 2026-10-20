import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, BookOpenText, CalendarCheck, CalendarDays, Check, Clock3, Flame, Plus, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '@/components/feedback/empty-state'
import { ErrorState } from '@/components/feedback/error-state'
import { LoadingState } from '@/components/feedback/loading-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/features/auth/auth-provider'
import { completedTasksOnDate, minutesByCategory, studyStreak } from '@/features/analytics/metrics'
import { listAllActivities } from '@/features/logs/logs-api'
import { listMilestones, listProjects } from '@/features/projects/projects-api'
import { TaskFormDialog } from '@/features/tasks/task-form-dialog'
import { createTask, listTasks, type TaskInput } from '@/features/tasks/tasks-api'
import { getUserSettings } from '@/features/settings/settings-api'
import { useNow } from '@/hooks/use-now'
import { DEFAULT_TIMEZONE, dateKeyInTimezone, formatDate } from '@/lib/date-utils'
import { queryKeys } from '@/lib/query-keys'
import type { ActivityLogRow, StudyCategory, TaskRow } from '@/types/database'

const categoryLabels: Record<StudyCategory, string> = { java: 'Java', ai: 'AI / Python', research: '科研', other: '其他' }
const categoryColors: Record<StudyCategory, string> = { java: '#F59E0B', ai: '#8B5CF6', research: '#0D9488', other: '#94A3B8' }
const taskStatusLabels = { todo: '待办', doing: '进行中', done: '已完成', canceled: '已取消' } as const
const emptyActivities: ActivityLogRow[] = []
const emptyTasks: TaskRow[] = []

function formatMinutes(minutes: number) {
  return minutes < 60 ? `${minutes} 分钟` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`
}

function TaskQuickCard({ task, projects }: { task: TaskRow; projects: Map<string, string> }) {
  return <div className="flex items-center gap-3 border-b py-3 last:border-0"><span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${task.status === 'doing' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{task.status === 'done' ? <Check aria-hidden="true" className="size-4" /> : <span className="size-2 rounded-full bg-current" />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{task.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{task.category === 'java' ? 'Java' : task.category === 'ai' ? 'AI / Python' : task.category === 'research' ? '科研' : '其他'}{task.project_id ? ` · ${projects.get(task.project_id) ?? ''}` : ''}{task.due_date ? ` · 截止 ${task.due_date}` : ''}</p></div><Badge variant={task.status === 'doing' ? 'secondary' : 'outline'}>{taskStatusLabels[task.status]}</Badge></div>
}

function RecentActivity({ activity, projectName }: { activity: ActivityLogRow; projectName: string | undefined }) {
  return <div className="flex items-start gap-3 border-b py-3 last:border-0"><span className="mt-1 size-2 shrink-0 rounded-full" style={{ backgroundColor: categoryColors[activity.category] }} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{activity.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{formatDate(activity.activity_date, { year: 'numeric' })}{projectName ? ` · ${projectName}` : ''}</p></div><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{activity.duration_minutes} 分</span></div>
}

export function DashboardPage() {
  const now = useNow()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: queryKeys.settings(userId), queryFn: getUserSettings, enabled: Boolean(userId) })
  const timezone = settingsQuery.data?.timezone ?? DEFAULT_TIMEZONE
  const today = dateKeyInTimezone(now, timezone)
  const tasksQuery = useQuery({ queryKey: queryKeys.tasks(userId), queryFn: listTasks, enabled: Boolean(userId) })
  const activitiesQuery = useQuery({ queryKey: queryKeys.activities(userId), queryFn: listAllActivities, enabled: Boolean(userId) })
  const projectsQuery = useQuery({ queryKey: queryKeys.projects(userId), queryFn: listProjects, enabled: Boolean(userId) })
  const milestonesQuery = useQuery({ queryKey: queryKeys.milestones(userId), queryFn: listMilestones, enabled: Boolean(userId) })
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)

  const createMutation = useMutation({
    mutationFn: (input: TaskInput) => createTask(userId, input),
    onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) }), queryClient.invalidateQueries({ queryKey: ['dashboard', userId] })]); setTaskDialogOpen(false); toast.success('任务已创建') },
    onError: () => toast.error('任务创建失败，请检查网络后重试。'),
  })
  const tasks = tasksQuery.data ?? emptyTasks
  const activities = activitiesQuery.data ?? emptyActivities
  const todaysActivities = useMemo(() => activities.filter((activity) => activity.activity_date === today), [activities, today])
  const todayMinutesByCategory = minutesByCategory(todaysActivities)
  const totalToday = Object.values(todayMinutesByCategory).reduce((sum, value) => sum + value, 0)
  const doneToday = completedTasksOnDate(tasks, today, timezone)
  const streak = studyStreak(activities, today)
  const projects = useMemo(() => new Map((projectsQuery.data ?? []).map((project) => [project.id, project.name])), [projectsQuery.data])
  const todayTasks = useMemo(() => tasks.filter((task) => (task.status === 'todo' || task.status === 'doing') && (task.scheduled_date === today || (task.due_date !== null && task.due_date <= today))).sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')).slice(0, 6), [tasks, today])
  const recentActivities = activities.slice(0, 5)

  return <div className="space-y-7">
    <PageHeader description="把学习、任务与研究整理成清晰的下一步。" title="今日工作台" actions={<Button asChild size="sm" variant="outline"><Link to="/weekly"><CalendarCheck aria-hidden="true" className="size-4" />本周复盘</Link></Button>} />
    {settingsQuery.isError ? <ErrorState description="个人时区设置暂时无法读取，当前按默认北京时间计算。" onRetry={() => void settingsQuery.refetch()} /> : null}
    <section className="grid gap-4 xl:grid-cols-12">
      <Card className="overflow-hidden border-primary/15 bg-[linear-gradient(112deg,var(--card)_20%,color-mix(in_oklab,var(--primary)_7%,var(--card))_100%)] xl:col-span-8"><CardContent className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:items-end"><div className="max-w-xl"><div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary"><CalendarDays aria-hidden="true" className="size-4" /><span>{formatDate(today, { year: 'numeric', weekday: 'long' })}</span></div><h2 className="max-w-lg text-[22px] font-semibold leading-[1.28] tracking-[-0.035em] text-foreground sm:text-[28px]">为重要的事，留出一段专注时间。</h2><p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">每一条学习活动都会成为长期统计的一部分。今天完成一小步，也值得被记录。</p><div className="mt-5 flex flex-wrap items-center gap-2.5"><Button onClick={() => navigate('/logs?new=1')}><BookOpenText aria-hidden="true" className="size-4" />记录一次学习</Button><Button onClick={() => setTaskDialogOpen(true)} variant="outline"><Plus aria-hidden="true" className="size-4" />快速新增任务</Button></div></div><div className="grid gap-2 sm:grid-cols-2 lg:w-[280px] lg:grid-cols-1"><div className="rounded-xl border bg-background/80 px-4 py-3.5"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 aria-hidden="true" className="size-3.5" />今日学习时长</div><p className="mt-2 text-lg font-semibold tabular-nums">{activitiesQuery.isPending ? '…' : formatMinutes(totalToday)}</p></div><div className="rounded-xl border bg-background/80 px-4 py-3.5"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles aria-hidden="true" className="size-3.5" />今日完成任务</div><p className="mt-2 text-lg font-semibold tabular-nums">{tasksQuery.isPending ? '…' : `${doneToday} 项`}</p></div></div></CardContent></Card>
      <Card className="xl:col-span-4"><CardHeader className="pb-2"><CardTitle className="text-base">学习节奏</CardTitle><CardDescription>连续记录天数仅按有活动记录的日期计算。</CardDescription></CardHeader><CardContent><div className="flex items-center gap-4 rounded-xl border bg-muted/25 p-4"><span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400"><Flame aria-hidden="true" className="size-5" /></span><div><p className="text-2xl font-semibold tabular-nums">{activitiesQuery.isPending ? '…' : streak}<span className="ml-1 text-sm font-medium text-muted-foreground">天</span></p><p className="mt-0.5 text-xs text-muted-foreground">当前连续学习</p></div></div><p className="mt-3 text-xs leading-5 text-muted-foreground">任务完成不会自动增加学习时长。</p></CardContent></Card>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader className="flex-row items-start justify-between space-y-0 pb-1"><div><CardTitle className="text-base">今日待办</CardTitle><CardDescription className="mt-1">仅显示今天计划或已到截止日期的未完成任务。</CardDescription></div><Link className="text-sm font-medium text-primary hover:underline" to="/tasks">全部任务</Link></CardHeader><CardContent className="pt-1">{tasksQuery.isPending ? <LoadingState label="正在加载今日任务" rows={3} /> : null}{tasksQuery.isError ? <ErrorState description="今日待办暂时无法读取。" onRetry={() => void tasksQuery.refetch()} /> : null}{tasksQuery.isSuccess && todayTasks.length === 0 ? <EmptyState actionLabel="新增任务" className="min-h-40 px-2 py-6" description="为今天安排的任务会显示在这里。" onAction={() => setTaskDialogOpen(true)} title="今天没有待办任务" /> : null}{todayTasks.map((task) => <TaskQuickCard key={task.id} projects={projects} task={task} />)}</CardContent></Card>
      <Card><CardHeader className="flex-row items-start justify-between space-y-0 pb-1"><div><CardTitle className="text-base">最近学习记录</CardTitle><CardDescription className="mt-1">学习日期按 {timezone} 统计。</CardDescription></div><Link className="text-sm font-medium text-primary hover:underline" to="/logs">打开学习日志</Link></CardHeader><CardContent className="pt-1">{activitiesQuery.isPending ? <LoadingState label="正在加载学习记录" rows={3} /> : null}{activitiesQuery.isError ? <ErrorState description="最近学习记录暂时无法读取。" onRetry={() => void activitiesQuery.refetch()} /> : null}{activitiesQuery.isSuccess && recentActivities.length === 0 ? <EmptyState actionLabel="记录学习" className="min-h-40 px-2 py-6" description="记录第一条真实活动后，学习时长和趋势统计就会开始。" onAction={() => navigate('/logs?new=1')} title="还没有学习记录" /> : null}{recentActivities.map((activity) => <RecentActivity activity={activity} key={activity.id} projectName={projects.get(activity.project_id ?? '')} />)}</CardContent></Card>
    </section>

    <Card><CardHeader className="flex-row flex-wrap items-end justify-between gap-3 space-y-0 pb-4"><div><CardTitle className="text-base">今日分类投入</CardTitle><CardDescription className="mt-1">按活动记录汇总，不包含任务状态。</CardDescription></div><Button asChild size="sm" variant="outline"><Link to="/analytics">查看数据统计<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link></Button></CardHeader><CardContent>{activitiesQuery.isPending ? <LoadingState label="正在汇总学习时长" rows={2} /> : null}{activitiesQuery.isError ? <ErrorState description="分类统计暂时无法读取。" onRetry={() => void activitiesQuery.refetch()} /> : null}{activitiesQuery.isSuccess && totalToday === 0 ? <EmptyState className="min-h-36 px-2 py-5" description="今天还没有活动记录。" onAction={() => navigate('/logs?new=1')} actionLabel="记录一次学习" title="暂无分类时长" /> : null}{totalToday > 0 ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(Object.keys(categoryLabels) as StudyCategory[]).map((category) => { const minutes = todayMinutesByCategory[category]; const share = Math.round(minutes / totalToday * 100); return <div className="rounded-xl border bg-muted/20 p-4" key={category}><div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 text-sm font-medium"><span className="size-2.5 rounded-full" style={{ backgroundColor: categoryColors[category] }} />{categoryLabels[category]}</span><span className="text-xs text-muted-foreground">{share}%</span></div><p className="mt-3 text-lg font-semibold tabular-nums">{minutes} <span className="text-xs font-normal text-muted-foreground">分钟</span></p></div> })}</div> : null}</CardContent></Card>

    <TaskFormDialog isSaving={createMutation.isPending} milestones={milestonesQuery.data ?? []} onOpenChange={setTaskDialogOpen} onSave={async (input: TaskInput) => createMutation.mutateAsync(input).then(() => undefined)} open={taskDialogOpen} projects={projectsQuery.data ?? []} task={null} />
  </div>
}
