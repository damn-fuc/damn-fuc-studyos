import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { MilestoneRow, ProjectRow, TaskRow } from '@/types/database'
import { taskSchema, type TaskFormValues } from './task-schema'
import type { TaskInput } from './tasks-api'

type TaskFormDialogProps = {
  open: boolean
  task: TaskRow | null
  projects: ProjectRow[]
  milestones: MilestoneRow[]
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: TaskInput) => Promise<void>
}

const defaultValues: TaskFormValues = {
  title: '', description: '', category: 'java', status: 'todo', priority: 'medium',
  scheduled_date: '', due_date: '', project_id: '', milestone_id: '',
}

const fieldClass = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

export function TaskFormDialog({ open, task, projects, milestones, isSaving, onOpenChange, onSave }: TaskFormDialogProps) {
  const form = useForm<TaskFormValues>({ resolver: zodResolver(taskSchema), defaultValues })
  const projectId = form.watch('project_id')
  const projectRegistration = form.register('project_id')

  useEffect(() => {
    if (!open) return
    form.reset(task ? {
      title: task.title,
      description: task.description,
      category: task.category,
      status: task.status,
      priority: task.priority,
      scheduled_date: task.scheduled_date ?? '',
      due_date: task.due_date ?? '',
      project_id: task.project_id ?? '',
      milestone_id: task.milestone_id ?? '',
    } : defaultValues)
  }, [form, open, task])

  async function submit(values: TaskFormValues) {
    await onSave({
      ...values,
      scheduled_date: values.scheduled_date || null,
      due_date: values.due_date || null,
      project_id: values.project_id || null,
      milestone_id: values.milestone_id || null,
    })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[min(90dvh,760px)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{task ? '编辑任务' : '新增任务'}</DialogTitle>
          <DialogDescription>计划日期和截止日期会按原值保存，不会因任务状态变化而自动调整。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="task-title">任务名称</label>
            <Input autoFocus id="task-title" maxLength={200} placeholder="例如：完成 Java 集合框架复习" {...form.register('title')} />
            {form.formState.errors.title?.message ? <p className="text-xs text-destructive" role="alert">{form.formState.errors.title.message}</p> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1.5 text-sm font-medium">分类
              <select className={fieldClass} {...form.register('category')}>
                <option value="java">Java</option><option value="ai">AI / Python</option><option value="research">科研</option><option value="other">其他</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">优先级
              <select className={fieldClass} {...form.register('priority')}>
                <option value="low">低</option><option value="medium">中</option><option value="high">高</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">状态
              <select className={fieldClass} {...form.register('status')}>
                <option value="todo">待办</option><option value="doing">进行中</option><option value="done">已完成</option><option value="canceled">已取消</option>
              </select>
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">计划日期
              <Input type="date" {...form.register('scheduled_date')} />
            </label>
            <label className="space-y-1.5 text-sm font-medium">截止日期
              <Input type="date" {...form.register('due_date')} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">关联项目
              <select className={fieldClass} {...projectRegistration} onChange={(event) => { if (event.target.value !== projectId) form.setValue('milestone_id', ''); void projectRegistration.onChange(event) }}>
                <option value="">不关联</option>
                {projects.filter((item) => !item.archived_at).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-medium">里程碑
              <select className={fieldClass} disabled={!projectId} {...form.register('milestone_id')}>
                <option value="">不关联</option>
                {milestones.filter((item) => item.project_id === projectId).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">描述
            <Textarea className="min-h-24" maxLength={5000} placeholder="补充背景或完成标准" {...form.register('description')} />
          </label>
          <DialogFooter>
            <Button disabled={isSaving} onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button>
            <Button disabled={isSaving} type="submit">{isSaving ? '正在保存…' : task ? '保存修改' : '创建任务'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
