import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, FolderKanban, ListChecks, Pencil, Plus, Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { ErrorState } from '@/components/feedback/error-state'
import { EmptyState } from '@/components/feedback/empty-state'
import { LoadingState } from '@/components/feedback/loading-state'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAuth } from '@/features/auth/auth-provider'
import { listTasks } from '@/features/tasks/tasks-api'
import { createMilestone, createProject, deleteMilestone, deleteProject, listMilestones, listProjects, setProjectArchived, updateMilestone, updateProject, type MilestoneInput, type ProjectInput } from '@/features/projects/projects-api'
import { MilestoneFormDialog } from '@/features/projects/milestone-form-dialog'
import { ProjectFormDialog } from '@/features/projects/project-form-dialog'
import { queryKeys } from '@/lib/query-keys'
import type { Json, MilestoneRow, ProjectRow } from '@/types/database'

const statusLabels = { active: '进行中', paused: '已暂停', completed: '已完成' } as const

function externalLinks(links: Json): { label: string; url: string }[] {
  if (!Array.isArray(links)) return []
  return links.flatMap((value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return []
    const url = value['url']
    const label = value['label']
    if (typeof url !== 'string' || (typeof label !== 'string' && label !== undefined)) return []
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return []
    } catch { return [] }
    return [{ url, label: typeof label === 'string' ? label : url }]
  })
}

export function ProjectsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id ?? ''
  const [showArchived, setShowArchived] = useState(false)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null)
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [activeProjectId, setActiveProjectId] = useState('')
  const [editingMilestone, setEditingMilestone] = useState<MilestoneRow | null>(null)

  const projectsQuery = useQuery({ queryKey: queryKeys.projects(userId), queryFn: listProjects, enabled: Boolean(userId) })
  const milestonesQuery = useQuery({ queryKey: queryKeys.milestones(userId), queryFn: listMilestones, enabled: Boolean(userId) })
  const tasksQuery = useQuery({ queryKey: queryKeys.tasks(userId), queryFn: listTasks, enabled: Boolean(userId) })
  const invalidate = async () => Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.projects(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.milestones(userId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.tasks(userId) }),
    queryClient.invalidateQueries({ queryKey: ['activities', userId] }),
  ])

  const projectMutation = useMutation({
    mutationFn: ({ project, input }: { project: ProjectRow | null; input: ProjectInput }) => project ? updateProject(project.id, input) : createProject(userId, input),
    onSuccess: async (_row, { project }) => { await invalidate(); setProjectDialogOpen(false); setEditingProject(null); toast.success(project ? '项目已更新' : '项目已创建') },
    onError: () => toast.error('项目保存失败，请检查网络后重试。'),
  })
  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => setProjectArchived(id, archived),
    onSuccess: async (_value, { archived }) => { await invalidate(); toast.success(archived ? '项目已归档' : '项目已恢复') },
    onError: () => toast.error('项目归档状态更新失败。'),
  })
  const deleteProjectMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => { await invalidate(); toast.success('项目已删除') },
    onError: () => toast.error('项目删除失败。请先移除关联的任务和学习记录。'),
  })
  const milestoneMutation = useMutation({
    mutationFn: ({ milestone, input }: { milestone: MilestoneRow | null; input: MilestoneInput }) => milestone ? updateMilestone(milestone.id, input) : createMilestone(userId, input),
    onSuccess: async (_row, { milestone }) => { await invalidate(); setMilestoneDialogOpen(false); setEditingMilestone(null); toast.success(milestone ? '里程碑已更新' : '里程碑已创建') },
    onError: () => toast.error('里程碑保存失败，请检查网络后重试。'),
  })
  const deleteMilestoneMutation = useMutation({
    mutationFn: deleteMilestone,
    onSuccess: async () => { await invalidate(); toast.success('里程碑已删除') },
    onError: () => toast.error('该里程碑可能仍有关联任务，请先解除任务关联。'),
  })

  const projects = useMemo(() => (projectsQuery.data ?? []).filter((project) => showArchived ? project.archived_at !== null : project.archived_at === null), [projectsQuery.data, showArchived])
  const tasksByProject = useMemo(() => {
    const values = new Map<string, { total: number; done: number }>()
    for (const task of tasksQuery.data ?? []) {
      if (!task.project_id || task.status === 'canceled') continue
      const summary = values.get(task.project_id) ?? { total: 0, done: 0 }
      summary.total += 1
      if (task.status === 'done') summary.done += 1
      values.set(task.project_id, summary)
    }
    return values
  }, [tasksQuery.data])
  const milestonesByProject = useMemo(() => {
    const values = new Map<string, MilestoneRow[]>()
    for (const milestone of milestonesQuery.data ?? []) values.set(milestone.project_id, [...(values.get(milestone.project_id) ?? []), milestone])
    return values
  }, [milestonesQuery.data])

  function beginProject(project: ProjectRow | null) { setEditingProject(project); setProjectDialogOpen(true) }
  function beginMilestone(projectId: string, milestone: MilestoneRow | null = null) { setActiveProjectId(projectId); setEditingMilestone(milestone); setMilestoneDialogOpen(true) }
  function confirmDeleteProject(project: ProjectRow) { if (window.confirm(`确定删除项目“${project.name}”吗？关联的里程碑会一起删除，关联任务或活动会阻止删除。`)) deleteProjectMutation.mutate(project.id) }
  function confirmDeleteMilestone(milestone: MilestoneRow) { if (window.confirm(`确定删除里程碑“${milestone.title}”吗？此操作无法撤销。`)) deleteMilestoneMutation.mutate(milestone.id) }

  return (
    <div className="space-y-5">
      <PageHeader description="集中管理学习主题、科研论文和阶段里程碑；项目进度根据关联任务实时计算。" title="项目中心" actions={<Button onClick={() => beginProject(null)} size="sm"><Plus aria-hidden="true" className="size-4" />新建项目</Button>} />
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">{projects.length} 个{showArchived ? '归档' : '进行中及未归档'}项目</p><Button onClick={() => setShowArchived((value) => !value)} size="sm" variant="outline">{showArchived ? <ArchiveRestore aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}{showArchived ? '查看未归档项目' : '查看归档项目'}</Button></div>
      {projectsQuery.isPending ? <LoadingState label="正在加载项目" rows={3} /> : null}
      {projectsQuery.isError ? <ErrorState description="项目暂时无法从云端读取。" onRetry={() => void projectsQuery.refetch()} /> : null}
      {tasksQuery.isError ? <ErrorState description="项目任务进度暂时无法读取，项目数据仍可查看。" onRetry={() => void tasksQuery.refetch()} /> : null}
      {milestonesQuery.isError ? <ErrorState description="里程碑暂时无法读取。" onRetry={() => void milestonesQuery.refetch()} /> : null}
      {projectsQuery.isSuccess && projects.length === 0 ? <EmptyState {...(!showArchived && (projectsQuery.data?.length ?? 0) === 0 ? { actionLabel: '创建第一个项目', onAction: () => beginProject(null) } : {})} description={showArchived ? '归档项目会显示在这里。' : '创建学习或科研项目，关联任务、活动和阶段里程碑。'} icon={<FolderKanban aria-hidden="true" className="size-5" />} title={showArchived ? '没有归档项目' : '还没有项目'} /> : null}
      {projectsQuery.isSuccess && projects.length > 0 ? <div className="grid gap-4 xl:grid-cols-2">{projects.map((project) => {
        const progress = tasksByProject.get(project.id)
        const percentage = progress && progress.total > 0 ? Math.round(progress.done / progress.total * 100) : 0
        const milestones = milestonesByProject.get(project.id) ?? []
        const links = externalLinks(project.external_links)
        return <Card className="overflow-hidden" key={project.id}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-base">{project.name}</CardTitle><Badge variant={project.kind === 'research' ? 'secondary' : 'outline'}>{project.kind === 'research' ? '科研项目' : '学习项目'}</Badge><Badge variant={project.status === 'completed' ? 'default' : project.status === 'paused' ? 'secondary' : 'outline'}>{statusLabels[project.status]}</Badge></div><CardDescription className="mt-1">{project.goal || project.description || '尚未填写目标'}</CardDescription></div><div className="flex shrink-0 gap-1"><Button aria-label={`编辑 ${project.name}`} onClick={() => beginProject(project)} size="icon-sm" variant="ghost"><Pencil aria-hidden="true" className="size-4" /></Button><Button aria-label={`${project.archived_at ? '恢复' : '归档'} ${project.name}`} onClick={() => archiveMutation.mutate({ id: project.id, archived: project.archived_at === null })} size="icon-sm" variant="ghost">{project.archived_at ? <ArchiveRestore aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}</Button><Button aria-label={`删除 ${project.name}`} onClick={() => confirmDeleteProject(project)} size="icon-sm" variant="ghost"><Trash2 aria-hidden="true" className="size-4" /></Button></div></div>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && project.goal ? <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{project.description}</p> : null}
            <div className="space-y-2"><div className="flex justify-between text-xs"><span className="text-muted-foreground">关联任务进度</span><span className="font-medium">{tasksQuery.isPending ? '计算中…' : progress?.total ? `${percentage}% · ${progress.done}/${progress.total}` : '暂无关联任务'}</span></div><Progress aria-label={`${project.name} 任务进度`} value={percentage} /></div>
            {links.length > 0 ? <div className="flex flex-wrap gap-2">{links.map((link) => <a className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" href={link.url} key={`${link.url}-${link.label}`} rel="noreferrer" target="_blank"><ExternalLink aria-hidden="true" className="size-3.5" />{link.label}</a>)}</div> : null}
            <div className="border-t pt-3"><div className="mb-2 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-medium"><ListChecks aria-hidden="true" className="size-4 text-muted-foreground" />里程碑 <span className="text-xs text-muted-foreground">{milestones.filter((item) => item.status === 'done').length}/{milestones.length}</span></h3><Button onClick={() => beginMilestone(project.id)} size="sm" variant="ghost"><Plus aria-hidden="true" className="size-3.5" />新增</Button></div>
              {milestones.length === 0 ? <p className="py-2 text-xs text-muted-foreground">还没有里程碑</p> : <ul className="space-y-2">{milestones.map((milestone) => <li className="flex items-center gap-2 rounded-lg bg-muted/45 px-3 py-2" key={milestone.id}><span className={`size-2 shrink-0 rounded-full ${milestone.status === 'done' ? 'bg-emerald-500' : milestone.status === 'doing' ? 'bg-primary' : 'bg-muted-foreground/40'}`} /><span className="min-w-0 flex-1 truncate text-sm">{milestone.title}</span>{milestone.due_date ? <span className="shrink-0 text-xs text-muted-foreground">{milestone.due_date}</span> : null}<Button aria-label={`编辑里程碑 ${milestone.title}`} onClick={() => beginMilestone(project.id, milestone)} size="icon-sm" variant="ghost"><Pencil aria-hidden="true" className="size-3.5" /></Button><Button aria-label={`删除里程碑 ${milestone.title}`} onClick={() => confirmDeleteMilestone(milestone)} size="icon-sm" variant="ghost"><Trash2 aria-hidden="true" className="size-3.5" /></Button></li>)}</ul>}
            </div>
          </CardContent>
        </Card>
      })}</div> : null}

      <ProjectFormDialog isSaving={projectMutation.isPending} onOpenChange={(open) => { setProjectDialogOpen(open); if (!open) setEditingProject(null) }} onSave={async (input: ProjectInput) => { await projectMutation.mutateAsync({ project: editingProject, input }) }} open={projectDialogOpen} project={editingProject} />
      <MilestoneFormDialog isSaving={milestoneMutation.isPending} milestone={editingMilestone} onOpenChange={(open) => { setMilestoneDialogOpen(open); if (!open) setEditingMilestone(null) }} onSave={async (input: MilestoneInput) => { await milestoneMutation.mutateAsync({ milestone: editingMilestone, input }) }} open={milestoneDialogOpen} projectId={activeProjectId} />
    </div>
  )
}
