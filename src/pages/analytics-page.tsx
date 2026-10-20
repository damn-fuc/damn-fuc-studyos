import { useMemo, useState } from 'react'
import * as echarts from 'echarts/core'
import { BarChart, HeatmapChart, PieChart } from 'echarts/charts'
import { CalendarComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsOption } from 'echarts'
import { useQuery } from '@tanstack/react-query'
import { Flame, Target } from 'lucide-react'

import { EmptyState } from '@/components/feedback/empty-state'
import { EChartsChart } from '@/components/charts/echarts-chart'
import { ErrorState } from '@/components/feedback/error-state'
import { LoadingState } from '@/components/feedback/loading-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/features/auth/auth-provider'
import { useNow } from '@/hooks/use-now'
import { completedTasksOnDate, minutesByCategory, minutesByDate, minutesByDateAndCategory, recentWeekStarts, studyStreak, trendForDays, weeklyStudyMinutes } from '@/features/analytics/metrics'
import { listActivitiesRange } from '@/features/logs/logs-api'
import { getUserSettings } from '@/features/settings/settings-api'
import { listTasks } from '@/features/tasks/tasks-api'
import { addCalendarDays, dateKeyInTimezone, DEFAULT_TIMEZONE, formatDate, getWeekStart } from '@/lib/date-utils'
import { queryKeys } from '@/lib/query-keys'
import type { ActivityLogRow, StudyCategory, TaskRow, TaskStatus } from '@/types/database'

const categories: StudyCategory[] = ['java', 'ai', 'research', 'other']
const categoryLabels: Record<StudyCategory, string> = { java: 'Java', ai: 'AI / Python', research: '科研', other: '其他' }
const categoryColors: Record<StudyCategory, string> = { java: '#F59E0B', ai: '#8B5CF6', research: '#0D9488', other: '#94A3B8' }
const taskStatuses: TaskStatus[] = ['todo', 'doing', 'done', 'canceled']
const taskStatusLabels: Record<TaskStatus, string> = { todo: '待办', doing: '进行中', done: '已完成', canceled: '已取消' }
const taskStatusColors: Record<TaskStatus, string> = { todo: '#94A3B8', doing: '#4F46E5', done: '#10B981', canceled: '#CBD5E1' }
const chartText = '#64748B'
const chartGrid = '#E2E8F0'
const emptyActivities: ActivityLogRow[] = []
const emptyTasks: TaskRow[] = []

echarts.use([BarChart, HeatmapChart, PieChart, CalendarComponent, GridComponent, LegendComponent, TooltipComponent, VisualMapComponent, CanvasRenderer])

function ChartEmpty({ description }: { description: string }) {
  return <EmptyState className="min-h-48 px-2 py-6" description={description} title="暂无可展示数据" />
}

export function AnalyticsPage() {
  const now = useNow()
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const settingsQuery = useQuery({ queryKey: queryKeys.settings(userId), queryFn: getUserSettings, enabled: Boolean(userId) })
  const timezone = settingsQuery.data?.timezone ?? DEFAULT_TIMEZONE
  const today = dateKeyInTimezone(now, timezone)
  const yearStart = addCalendarDays(today, -364)
  const activitiesQuery = useQuery({ queryKey: queryKeys.activityRange(userId, yearStart, today), queryFn: () => listActivitiesRange(yearStart, today), enabled: Boolean(userId) })
  const tasksQuery = useQuery({ queryKey: queryKeys.tasks(userId), queryFn: listTasks, enabled: Boolean(userId) })
  const [trendDays, setTrendDays] = useState<7 | 30 | 90>(30)
  const activities = activitiesQuery.data ?? emptyActivities
  const tasks = tasksQuery.data ?? emptyTasks
  const hasActivity = activities.length > 0
  const currentWeekStart = getWeekStart(today)
  const weeklyGoal = settingsQuery.data?.weekly_goal_minutes ?? 600
  const currentWeekMinutes = weeklyStudyMinutes(activities, currentWeekStart)
  const goalProgress = weeklyGoal > 0 ? Math.min(100, Math.round(currentWeekMinutes / weeklyGoal * 100)) : currentWeekMinutes > 0 ? 100 : 0
  const todayCompletedTasks = completedTasksOnDate(tasks, today, timezone)

  const categoryTotals = useMemo(() => minutesByCategory(activities.filter((activity) => activity.activity_date >= addCalendarDays(today, -(trendDays - 1)))), [activities, today, trendDays])
  const trendOption = useMemo<EChartsOption>(() => {
    const points = trendForDays(activities, today, trendDays)
    const categoryByDate = minutesByDateAndCategory(activities)
    const keys = points.map((point) => point.date.slice(5))
    return {
      animationDuration: 350,
      grid: { left: 38, right: 16, top: 24, bottom: 36 },
      legend: { bottom: 0, textStyle: { color: chartText, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
      tooltip: { trigger: 'axis', valueFormatter: (value) => `${String(value)} 分钟` },
      xAxis: { type: 'category', data: keys, axisLabel: { color: chartText, interval: trendDays === 7 ? 0 : 'auto', fontSize: 10 }, axisLine: { lineStyle: { color: chartGrid } }, axisTick: { show: false } },
      yAxis: { type: 'value', min: 0, axisLabel: { color: chartText, fontSize: 10 }, splitLine: { lineStyle: { color: chartGrid, type: 'dashed' } } },
      series: categories.map((category) => ({ name: categoryLabels[category], type: 'bar', stack: 'minutes', barMaxWidth: 26, itemStyle: { color: categoryColors[category], borderRadius: [2, 2, 0, 0] }, data: points.map((point) => categoryByDate.get(`${point.date}|${category}`) ?? 0) })),
    }
  }, [activities, today, trendDays])

  const categoryOption = useMemo<EChartsOption>(() => ({
    animationDuration: 350,
    tooltip: { trigger: 'item', formatter: '{b}: {c} 分钟 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: chartText, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    series: [{ type: 'pie', radius: ['48%', '72%'], center: ['50%', '43%'], avoidLabelOverlap: true, label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold', formatter: '{d}%' } }, data: categories.map((category) => ({ name: categoryLabels[category], value: categoryTotals[category], itemStyle: { color: categoryColors[category] } })).filter((item) => item.value > 0) }],
  }), [categoryTotals])

  const dateTotals = useMemo(() => minutesByDate(activities), [activities])
  const heatmapOption = useMemo<EChartsOption>(() => {
    const heatData = Array.from({ length: 365 }, (_, index) => {
      const date = addCalendarDays(yearStart, index)
      return [date, dateTotals.get(date) ?? 0]
    })
    const maximum = Math.max(60, ...heatData.map((row) => Number(row[1])))
    return {
      tooltip: { position: 'top', formatter: (params) => { const point = params as { value?: [string, number] }; return `${point.value?.[0] ?? ''}<br/>${point.value?.[1] ?? 0} 分钟` } },
      visualMap: { show: false, min: 0, max: maximum, inRange: { color: ['#F1F5F9', '#C7D2FE', '#818CF8', '#4F46E5'] } },
      calendar: { top: 30, left: 18, right: 18, cellSize: ['auto', 13], range: [yearStart, today], itemStyle: { borderWidth: 2, borderColor: 'transparent', color: '#F1F5F9' }, splitLine: { show: false }, dayLabel: { firstDay: 1, nameMap: 'cn', color: chartText, fontSize: 10 }, monthLabel: { color: chartText, fontSize: 10 }, yearLabel: { show: false } },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: heatData }],
    }
  }, [dateTotals, today, yearStart])

  const weeklyStarts = useMemo(() => recentWeekStarts(today, 12).reverse(), [today])
  const weeklyOption = useMemo<EChartsOption>(() => ({
    grid: { left: 38, right: 14, top: 24, bottom: 34 },
    tooltip: { trigger: 'axis', valueFormatter: (value) => `${String(value)} 分钟` },
    xAxis: { type: 'category', data: weeklyStarts.map((date) => date.slice(5)), axisLabel: { color: chartText, fontSize: 10 }, axisLine: { lineStyle: { color: chartGrid } }, axisTick: { show: false } },
    yAxis: { type: 'value', min: 0, axisLabel: { color: chartText, fontSize: 10 }, splitLine: { lineStyle: { color: chartGrid, type: 'dashed' } } },
    series: [{ type: 'bar', barMaxWidth: 32, data: weeklyStarts.map((date) => weeklyStudyMinutes(activities, date)), itemStyle: { color: '#4F46E5', borderRadius: [4, 4, 0, 0] } }],
  }), [activities, weeklyStarts])

  const taskCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = { todo: 0, doing: 0, done: 0, canceled: 0 }
    for (const task of tasks) counts[task.status] += 1
    return counts
  }, [tasks])
  const taskOption = useMemo<EChartsOption>(() => ({
    tooltip: { trigger: 'item', formatter: '{b}: {c} 项 ({d}%)' },
    legend: { bottom: 0, textStyle: { color: chartText, fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
    series: [{ type: 'pie', radius: ['45%', '70%'], center: ['50%', '43%'], label: { show: false }, data: taskStatuses.map((status) => ({ name: taskStatusLabels[status], value: taskCounts[status], itemStyle: { color: taskStatusColors[status] } })).filter((item) => item.value > 0) }],
  }), [taskCounts])
  const isPending = activitiesQuery.isPending || tasksQuery.isPending || settingsQuery.isPending
  const hasError = activitiesQuery.isError || tasksQuery.isError

  return <div className="space-y-5">
    <PageHeader description="学习时长取自活动记录；任务完成情况按数据库记录的完成时间统计。" title="数据统计" actions={<div className="flex rounded-lg border p-0.5">{([7, 30, 90] as const).map((days) => <button aria-pressed={trendDays === days} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${trendDays === days ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`} key={days} onClick={() => setTrendDays(days)} type="button">{days} 天</button>)}</div>} />
    {settingsQuery.isError ? <ErrorState description="使用默认北京时间和每周 600 分钟目标显示统计。" onRetry={() => void settingsQuery.refetch()} /> : null}
    {isPending ? <LoadingState label="正在汇总真实学习数据" rows={4} /> : null}
    {hasError ? <ErrorState description="学习统计暂时无法从 Supabase 读取。" onRetry={() => { void activitiesQuery.refetch(); void tasksQuery.refetch() }} /> : null}
    {!isPending && !hasError ? <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Target aria-hidden="true" className="size-5" /></span><div><p className="text-xs text-muted-foreground">本周学习时长</p><p className="mt-1 text-lg font-semibold tabular-nums">{currentWeekMinutes} <span className="text-xs font-normal text-muted-foreground">分钟</span></p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600"><Flame aria-hidden="true" className="size-5" /></span><div><p className="text-xs text-muted-foreground">连续记录天数</p><p className="mt-1 text-lg font-semibold tabular-nums">{studyStreak(activities, today)} <span className="text-xs font-normal text-muted-foreground">天</span></p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600"><span className="text-sm font-semibold">✓</span></span><div><p className="text-xs text-muted-foreground">今日完成任务</p><p className="mt-1 text-lg font-semibold tabular-nums">{todayCompletedTasks} <span className="text-xs font-normal text-muted-foreground">项</span></p></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="mb-2 flex items-center justify-between"><div><p className="text-xs text-muted-foreground">每周目标进度</p><p className="mt-1 text-lg font-semibold tabular-nums">{weeklyGoal > 0 ? `${goalProgress}%` : '关闭'}</p></div><Badge variant="outline">{weeklyGoal} 分钟</Badge></div><Progress aria-label="每周目标进度" value={goalProgress} /><p className="mt-2 text-xs text-muted-foreground">{weeklyGoal === 0 ? '未设置每周目标' : weeklyGoal > currentWeekMinutes ? `还差 ${weeklyGoal - currentWeekMinutes} 分钟` : '本周目标已达成'}</p></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">学习热力图</CardTitle><CardDescription>过去 365 天每天的学习时长，颜色越深表示投入越多。</CardDescription></CardHeader><CardContent>{hasActivity ? <EChartsChart aria-label="过去一年学习热力图" option={heatmapOption} style={{ height: 180, width: '100%' }} /> : <ChartEmpty description="记录活动后，这里会出现真实的每日学习时长。" />}</CardContent></Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">学习时长趋势</CardTitle><CardDescription>Java、AI / Python、科研和其他分类按天汇总。</CardDescription></CardHeader><CardContent>{hasActivity ? <EChartsChart aria-label={`${trendDays} 天学习时长趋势`} option={trendOption} style={{ height: 280, width: '100%' }} /> : <ChartEmpty description="开始记录学习活动后，趋势图就会有数据。" />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">分类时间占比</CardTitle><CardDescription>展示所选 {trendDays} 天里不同方向的时间分配。</CardDescription></CardHeader><CardContent>{Object.values(categoryTotals).some((value) => value > 0) ? <EChartsChart aria-label="分类学习时间占比" option={categoryOption} style={{ height: 280, width: '100%' }} /> : <ChartEmpty description="所选日期范围内没有学习时长。" />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">每周学习时长</CardTitle><CardDescription>最近 12 个自然周（周一至周日）。</CardDescription></CardHeader><CardContent>{hasActivity ? <EChartsChart aria-label="最近十二周学习时长" option={weeklyOption} style={{ height: 260, width: '100%' }} /> : <ChartEmpty description="尚无可汇总的周学习时长。" />}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">任务状态</CardTitle><CardDescription>按当前任务状态汇总。</CardDescription></CardHeader><CardContent>{tasks.length > 0 ? <EChartsChart aria-label="任务状态分布" option={taskOption} style={{ height: 260, width: '100%' }} /> : <ChartEmpty description="创建任务后，这里会显示任务完成情况。" />}</CardContent></Card>
      </div>
      <p className="text-xs text-muted-foreground">统计时区：{timezone} · 当前周从 {formatDate(currentWeekStart, { year: 'numeric' })} 开始 · 周目标按个人设置读取</p>
    </> : null}
  </div>
}
