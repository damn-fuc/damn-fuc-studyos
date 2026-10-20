import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Json, ProjectRow } from '@/types/database'
import type { ProjectInput } from './projects-api'

const schema = z.object({
  name: z.string().trim().min(1, '请输入项目名称').max(160, '名称最多 160 个字符'),
  description: z.string().max(5000),
  kind: z.enum(['learning', 'research']),
  status: z.enum(['active', 'paused', 'completed']),
  goal: z.string().max(5000),
  linksText: z.string().max(5000).superRefine((text, context) => {
    text.split('\n').map((line) => line.trim()).filter(Boolean).forEach((line, index) => {
      const splitAt = line.indexOf('|')
      const url = (splitAt >= 0 ? line.slice(splitAt + 1) : line).trim()
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('scheme')
      } catch {
        context.addIssue({ code: 'custom', message: `第 ${index + 1} 行需要填写 http(s) 链接，格式：名称 | https://…` })
      }
    })
  }),
})
type FormValues = z.infer<typeof schema>
const fieldClass = 'flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50'

function formatLinks(links: Json): string {
  if (!Array.isArray(links)) return ''
  return links.flatMap((value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return []
    const label = value['label']
    const url = value['url']
    if (typeof url !== 'string') return []
    return [`${typeof label === 'string' ? label : url} | ${url}`]
  }).join('\n')
}

function parseLinks(linksText: string): Json {
  return linksText.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => {
    const splitAt = line.indexOf('|')
    const url = (splitAt >= 0 ? line.slice(splitAt + 1) : line).trim()
    const label = (splitAt >= 0 ? line.slice(0, splitAt) : url).trim()
    return { label: label || url, url }
  })
}

type ProjectFormDialogProps = {
  open: boolean
  project: ProjectRow | null
  isSaving: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: ProjectInput) => Promise<void>
}

export function ProjectFormDialog({ open, project, isSaving, onOpenChange, onSave }: ProjectFormDialogProps) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', description: '', kind: 'learning', status: 'active', goal: '', linksText: '' } })
  useEffect(() => {
    if (!open) return
    form.reset(project ? {
      name: project.name, description: project.description, kind: project.kind, status: project.status, goal: project.goal, linksText: formatLinks(project.external_links),
    } : { name: '', description: '', kind: 'learning', status: 'active', goal: '', linksText: '' })
  }, [form, open, project])

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[min(90dvh,760px)] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{project ? '编辑项目' : '新建项目'}</DialogTitle><DialogDescription>可添加 GitHub、论文或资料链接；归档项目会从默认视图收起。</DialogDescription></DialogHeader>
        <form className="space-y-4" noValidate onSubmit={form.handleSubmit(async (values) => onSave({ name: values.name, description: values.description, kind: values.kind, status: values.status, goal: values.goal, external_links: parseLinks(values.linksText) }))}>
          <label className="block space-y-1.5 text-sm font-medium">项目名称<Input autoFocus maxLength={160} placeholder="例如：医学影像分类研究" {...form.register('name')} />{form.formState.errors.name?.message ? <span className="block text-xs text-destructive">{form.formState.errors.name.message}</span> : null}</label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium">项目类型<select className={fieldClass} {...form.register('kind')}><option value="learning">学习项目</option><option value="research">科研项目</option></select></label>
            <label className="space-y-1.5 text-sm font-medium">状态<select className={fieldClass} {...form.register('status')}><option value="active">进行中</option><option value="paused">已暂停</option><option value="completed">已完成</option></select></label>
          </div>
          <label className="block space-y-1.5 text-sm font-medium">目标<Textarea className="min-h-20" maxLength={5000} placeholder="说明项目要达成的结果" {...form.register('goal')} /></label>
          <label className="block space-y-1.5 text-sm font-medium">项目说明<Textarea className="min-h-20" maxLength={5000} placeholder="背景、范围或研究问题" {...form.register('description')} /></label>
          <label className="block space-y-1.5 text-sm font-medium">外部链接 <span className="font-normal text-muted-foreground">每行一个：名称 | URL</span>
            <Textarea className="min-h-20 font-mono text-xs" maxLength={5000} placeholder={'GitHub | https://github.com/…\n论文 | https://…'} {...form.register('linksText')} />
            {form.formState.errors.linksText?.message ? <span className="block text-xs text-destructive" role="alert">{form.formState.errors.linksText.message}</span> : null}
          </label>
          <DialogFooter><Button disabled={isSaving} onClick={() => onOpenChange(false)} type="button" variant="outline">取消</Button><Button disabled={isSaving} type="submit">{isSaving ? '正在保存…' : project ? '保存修改' : '创建项目'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
