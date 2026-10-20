import { z } from 'zod'

export const activitySchema = z.object({
  activity_date: z.string().min(1, '请选择日期'),
  category: z.enum(['java', 'ai', 'research', 'other']),
  title: z.string().trim().min(1, '请输入活动名称').max(200, '名称最多 200 个字符'),
  content: z.string().max(10_000, '内容最多 10000 个字符'),
  duration_minutes: z.number().int('请输入整数分钟数').min(0, '时长不能为负数').max(100_000, '时长超出范围'),
  notes: z.string().max(10_000, '笔记最多 10000 个字符'),
  project_id: z.string(),
})

export type ActivityFormValues = z.infer<typeof activitySchema>
