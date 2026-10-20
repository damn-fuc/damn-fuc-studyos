import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { MilestoneRow } from '@/types/database'
import type { MilestoneInput } from './projects-api'

const schema = z.object({ title: z.string().trim().min(1, '请输入里程碑名称').max(160), description: z.string().max(5000), due_date: z.string(), status: z.enum(['todo', 'doing', 'done']) })
type FormValues = z.infer<typeof schema>
type Props = { open: boolean; projectId: string; milestone: MilestoneRow | null; isSaving: boolean; onOpenChange: (open: boolean) => void; onSave: (input: MilestoneInput) => Promise<void> }

export function MilestoneFormDialog({ open, projectId, milestone, isSaving, onOpenChange, onSave }: Props) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { title: '', description: '', due_date: '', status: 'todo' } })
  useEffect(() => {
    if (open) form.reset(milestone ? { title: milestone.title, description: milestone.description, due_date: milestone.due_date ?? '', status: milestone.status } : { title: '', description: '', due_date: '', status: 'todo' })
  }, [form, milestone, open])
  return <Dialog onOpenChange={onOpenChange} open={open}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><DialogTitle>{milestone ? '编辑里程碑' : '新增里程碑'}</DialogTitle><DialogDescription>为项目拆分可检查的阶段结果。</DialogDescription></DialogHeader>
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(async (value) => onSave({ ...value, project_id: projectId, due_date: value.due_date || null }))}>
      <label className="block space-y-1.5 text-sm font-medium">名称<Input autoFocus maxLength={160} {...form.register('title')} />{form.formState.errors.title?.message ? <span className="block text-xs text-destructive">{form.formState.errors.title.message}</span> : null}</label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="space-y-1.5 text-sm font-medium">截止日期<Input type="date" {...form.register('due_date')} /></label><label className="space-y-1.5 text-sm font-medium">状态<select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" {...form.register('status')}><option value="todo">待办</option><option value="doing">进行中</option><option value="done">已完成</option></select></label></div>
      <label className="block space-y-1.5 text-sm font-medium">说明<Textarea maxLength={5000} {...form.register('description')} /></label>
      <DialogFooter><Button disabled={isSaving} onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button><Button disabled={isSaving} type="submit">{isSaving ? '正在保存…' : milestone ? '保存修改' : '创建里程碑'}</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>
}
