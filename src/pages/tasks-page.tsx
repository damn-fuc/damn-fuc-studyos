import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Circle, LayoutGrid, List, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ErrorState } from '@/components/feedback/error-state'
import { EmptyState } from '@/components/feedback/empty-state'
import { LoadingState } from '@/components/feedback/loading-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { dateKeyInTimezone, formatDate } from '@/lib/date-utils'
import { queryKeys } from '@/lib/query-keys'
import { useAuth } from '@/features/auth/auth-provider'
import { listMilestones, listProjects } from '@/features/projects/projects-api'
import { getUserSettings } from '@/features/settings/settings-api'
import { DEFAULT_TIMEZONE } from '@/lib/date-utils'
import { useNow } from '@/hooks/use-now'
import { TaskFormDialog } from '@/features/tasks/task-form-dialog'
import { createTask, deleteTask, listTasks, updateTask, updateTaskStatus, type TaskInput } from '@/features/tasks/tasks-api'
import type { TaskRow, TaskStatus } from '@/types/database'

const statuses: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '待办' }, { value: 'doing', label: '进行中' }, { value: 'done', label: '已完成' }, { value: 'canceled', label: '已取消' },
]
const categoryLabels = { java: 'Java', ai: 'AI / Python', research: '科研', other: '其他' } as const
const priorityLabels = { low: '低', medium: '中', high: '高' } as const
const priorityRank = { high: 0, medium: 1, low: 2 } as const

type TaskCardProps = {
  task: TaskRow
  projectName: string | undefined
  milestoneName: string | undefined
  today: string
  onEdit: (task: TaskRow) => void
  onDelete: (task: TaskRow) => void
  onStatusChange: (task: TaskRow, status: TaskStatus) => void
}

function TaskCard({ task, projectName, milestoneName, today, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const overdue = task.due_date !== null && task.due_date < today && task.status !== 'done' && task.status !== 'canceled'
  return (
    <Card className={overdue ? 'border-destructive/40 bg-destructive/[0.025]' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${task.status === 'done' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
            {task.status === 'done' ? <Check aria-hidden="true" className="size-4" /> : <Circle aria-hidden="true" className="size-3.5" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className={`text-sm font-medium ${task.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</h3>
              {overdue ? <Badge variant="destructive">已逾期</Badge> : null}
            </div>
            {task.description ? <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{task.description}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
              <span>{categoryLabels[task.category]}</span>
              <span className={task.priority === 'high' ? 'font-medium text-amber-700 dark:text-amber-400' : ''}>优先级：{priorityLabels[task.priority]}</span>
              {projectName ? <span className="max-w-40 truncate">项目：{projectName}</span> : null}
              {milestoneName ? <span className="max-w-40 truncate">里程碑：{milestoneName}</span> : null}
              {task.scheduled_date ? <span>计划 {formatDate(task.scheduled_date)}</span> : null}
              {task.due_date ? <span className={overdue ? 'font-medium text-destructive' : ''}>截止 {formatDate(task.due_date)}</span> : null}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <select aria-label={`更改 ${task.title} 状态`} className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50" onChange={(event) => onStatusChange(task, event.target.value as TaskStatus)} value={task.status}>
            {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <Button aria-label={`编辑 ${task.title}`} onClick={() => onEdit(task)} size="icon-sm" variant="ghost"><Pencil aria-hidden="true" className="size-4" /></Button>
            <Button aria-label={`删除 ${task.title}`} onClick={() => onDelete(task)} size="icon-sm" variant="ghost"><Trash2 aria-hidden="true" className="size-4 text-muted-foreground" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TasksPage() {
  const now = useNow()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? ''
  const settingsQuery = useQuery({ queryKey: queryKeys.settings(userId), queryFn: getUserSettings, enabled: Boolean(userId) })
  const today = dateKeyInTimezone(now, settingsQuery.data?.timezone ?? DEFAULT_TIMEZONE)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [view, setView] = useState<'list' | 'board'>('list')
  const [sort, setSort] = useState<'date' | 'priority'>('date')

  const tasksQuery = useQuery({ queryKey: queryKeys.tasks(userId), queryFn: listTasks, enabled: Boolean(userId) })
  const projectsQuery = useQuery({ queryKey: queryKeys.projects(userId), queryFn: listProjects, enabled: Boolean(userId) })
  const milestonesQuery = useQuery({ queryKey: queryKeys.milestones(userId), queryFn: listMilestones, enabled: Boolean(userId) })
  const invalidate = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects(userId) }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', userId] }),
    queryClient.invalidateQueries({ queryKey: ['analytics', userId] }),
  ])
  const saveMutation = useMutation({
    mutationFn: ({ task, input }: { task: TaskRow | null; input: TaskInput }) => task ? updateTask(task.id, input) : createTask(userId, input),
    onSuccess: async (_row, { task }) => { await invalidate(); setIsFormOpen(false); setEditingTask(null); toast.success(task ? '任务已更新' : '任务已创建') },
    onError: () => toast.error('保存失败，请检查网络后重试。'),
  })
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) => updateTaskStatus(id, status),
    onSuccess: async () => { await invalidate(); toast.success('任务状态已更新') },
    onError: () => { toast.error('状态更新失败，请重试。'); void tasksQuery.refetch() },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: async () => { await invalidate(); toast.success('任务已删除') },
    onError: () => toast.error('删除失败。若该任务有依赖关联，请先解除关联后重试。'),
  })
  const projectMap = useMemo(() => new Map((projectsQuery.data ?? []).map((project) => [project.id, project.name])), [projectsQuery.data])
  const milestoneMap = useMemo(() => new Map((milestonesQuery.data ?? []).map((item) => [item.id, item.title])), [milestonesQuery.data])
  const filteredTasks = useMemo(() => {
    const term = search.trim().toLocaleLowerCase()
    return (tasksQuery.data ?? []).filter((task) => {
      const text = `${task.title} ${task.description} ${projectMap.get(task.project_id ?? '') ?? ''}`.toLocaleLowerCase()
      return (!term || text.includes(term)) && (statusFilter === 'all' || task.status === statusFilter) && (categoryFilter === 'all' || task.category === categoryFilter)
    }).sort((a, b) => sort === 'priority'
      ? priorityRank[a.priority] - priorityRank[b.priority] || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999')
      : (a.scheduled_date ?? a.due_date ?? '9999').localeCompare(b.scheduled_date ?? b.due_date ?? '9999'))
  }, [categoryFilter, projectMap, search, sort, statusFilter, tasksQuery.data])

  const beginCreate = () => { setEditingTask(null); setIsFormOpen(true) }
  const beginEdit = (task: TaskRow) => { setEditingTask(task); setIsFormOpen(true) }
  const confirmDelete = (task: TaskRow) => { if (window.confirm(`确定删除任务“${task.title}”吗？此操作无法撤销。`)) deleteMutation.mutate(task.id) }

  return (
    <div className="space-y-5">
      <PageHeader description="按计划和优先级推进 Java、AI 与科研工作；任务状态不会改变日期或学习时长。" title="任务" actions={<Button onClick={beginCreate} size="sm"><Plus aria-hidden="true" className="size-4" />新增任务</Button>} />
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-52"><Search aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label="搜索任务" className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="搜索任务或项目…" value={search} /></div>
        <select aria-label="按状态筛选" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}><option value="all">所有状态</option>{statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
        <select aria-label="按分类筛选" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option value="all">所有分类</option><option value="java">Java</option><option value="ai">AI / Python</option><option value="research">科研</option><option value="other">其他</option></select>
        <select aria-label="任务排序" className="h-9 rounded-lg border border-input bg-background px-3 text-sm" onChange={(event) => setSort(event.target.value as typeof sort)} value={sort}><option value="date">按日期排序</option><option value="priority">按优先级排序</option></select>
        <div aria-label="任务视图" className="flex rounded-lg border p-0.5"><Button aria-pressed={view === 'list'} onClick={() => setView('list')} size="icon-sm" variant={view === 'list' ? 'secondary' : 'ghost'}><List aria-hidden="true" className="size-4" /><span className="sr-only">列表视图</span></Button><Button aria-pressed={view === 'board'} onClick={() => setView('board')} size="icon-sm" variant={view === 'board' ? 'secondary' : 'ghost'}><LayoutGrid aria-hidden="true" className="size-4" /><span className="sr-only">看板视图</span></Button></div>
      </div>

      {tasksQuery.isPending ? <LoadingState label="正在加载任务" rows={4} /> : null}
      {tasksQuery.isError ? <ErrorState description="任务暂时无法从云端读取。你的数据未被本地样例替代。" onRetry={() => void tasksQuery.refetch()} /> : null}
      {tasksQuery.isSuccess && filteredTasks.length === 0 ? <EmptyState {...(tasksQuery.data.length === 0 ? { actionLabel: '创建第一个任务', onAction: beginCreate } : {})} description={tasksQuery.data.length === 0 ? '记录下一步要做的事情，设置日期与分类。' : '试试更换搜索词或筛选条件。'} title={tasksQuery.data.length === 0 ? '还没有任务' : '没有符合条件的任务'} /> : null}
      {tasksQuery.isSuccess && filteredTasks.length > 0 && view === 'list' ? <div className="grid gap-3 lg:grid-cols-2">{filteredTasks.map((task) => <TaskCard key={task.id} milestoneName={milestoneMap.get(task.milestone_id ?? '')} onDelete={confirmDelete} onEdit={beginEdit} onStatusChange={(row, status) => statusMutation.mutate({ id: row.id, status })} projectName={projectMap.get(task.project_id ?? '')} task={task} today={today} />)}</div> : null}
      {tasksQuery.isSuccess && filteredTasks.length > 0 && view === 'board' ? <div className="grid gap-4 xl:grid-cols-4">{statuses.map((status) => { const group = filteredTasks.filter((task) => task.status === status.value); return <section aria-label={status.label} className="min-w-0 rounded-xl bg-muted/45 p-3" key={status.value}><div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-semibold">{status.label}</h2><Badge variant="secondary">{group.length}</Badge></div><div className="space-y-3">{group.map((task) => <TaskCard key={task.id} milestoneName={milestoneMap.get(task.milestone_id ?? '')} onDelete={confirmDelete} onEdit={beginEdit} onStatusChange={(row, nextStatus) => statusMutation.mutate({ id: row.id, status: nextStatus })} projectName={projectMap.get(task.project_id ?? '')} task={task} today={today} />)}{group.length === 0 ? <div className="flex min-h-20 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">暂无任务</div> : null}</div></section> })}</div> : null}

      <TaskFormDialog isSaving={saveMutation.isPending} milestones={milestonesQuery.data ?? []} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingTask(null) }} onSave={async (input) => { await saveMutation.mutateAsync({ task: editingTask, input }) }} open={isFormOpen} projects={projectsQuery.data ?? []} task={editingTask} />
    </div>
  )
}
