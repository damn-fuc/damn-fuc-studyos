import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ActivityLogRow, ProjectRow } from '@/types/database'
import { activitySchema, type ActivityFormValues } from './activity-schema'
import type { ActivityInput } from './logs-api'

type ActivityFormDialogProps = {
  open: boolean
  activity: ActivityLogRow | null
  date: string
  projects: ProjectRow[]
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: ActivityInput) => Promise<void>
}

const defaults = (date: string): ActivityFormValues => ({
  activity_date: date, category: 'java', title: '', content: '', duration_minutes: 30, notes: '', project_id: '',
})
const fieldClass = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

export function ActivityFormDialog({ open, activity, date, projects, isSaving, onOpenChange, onSave }: ActivityFormDialogProps) {
  const form = useForm<ActivityFormValues>({ resolver: zodResolver(activitySchema), defaultValues: defaults(date) })

  useEffect(() => {
    if (!open) return
    form.reset(activity ? {
      activity_date: activity.activity_date,
      category: activity.category,
      title: activity.title,
      content: activity.content,
      duration_minutes: activity.duration_minutes,
      notes: activity.notes,
      project_id: activity.project_id ?? '',
    } : defaults(date))
  }, [activity, date, form, open])

  async function submit(values: ActivityFormValues) {
    await onSave({ ...values, project_id: values.project_id || null })
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[min(90dvh,760px)] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{activity ? '编辑学习活动' : '记录学习活动'}</DialogTitle>
          <DialogDescription>每条记录独立保存时长；支持补录历史日期，时长不从任务计算。</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">日期<Input type="date" {...form.register('activity_date')} />{form.formState.errors.activity_date?.message ? <span className="block text-xs text-destructive">{form.formState.errors.activity_date.message}</span> : null}</label>
            <label className="space-y-1.5 text-sm font-medium">分类
              <select className={fieldClass} {...form.register('category')}><option value="java">Java</option><option value="ai">AI / Python</option><option value="research">科研</option><option value="other">其他</option></select>
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">活动名称
            <Input autoFocus maxLength={200} placeholder="例如：完成论文相关工作综述" {...form.register('title')} />
            {form.formState.errors.title?.message ? <span className="block text-xs text-destructive" role="alert">{form.formState.errors.title.message}</span> : null}
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">时长（分钟）
              <Input inputMode="numeric" max={100000} min={0} type="number" {...form.register('duration_minutes', { valueAsNumber: true })} />
              {form.formState.errors.duration_minutes?.message ? <span className="block text-xs text-destructive" role="alert">{form.formState.errors.duration_minutes.message}</span> : null}
            </label>
            <label className="space-y-1.5 text-sm font-medium">关联项目
              <select className={fieldClass} {...form.register('project_id')}><option value="">不关联</option>{projects.filter((project) => !project.archived_at).map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select>
            </label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">学习内容 <span className="font-normal text-muted-foreground">支持 Markdown</span>
            <Textarea className="min-h-24" maxLength={10000} placeholder="记录阅读、练习、实验或实现过程" {...form.register('content')} />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">笔记
            <Textarea className="min-h-20" maxLength={10000} placeholder="补充参考资料、代码位置或想法" {...form.register('notes')} />
          </label>
          <DialogFooter>
            <Button disabled={isSaving} onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button>
            <Button disabled={isSaving} type="submit">{isSaving ? '正在保存…' : activity ? '保存修改' : '保存记录'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
