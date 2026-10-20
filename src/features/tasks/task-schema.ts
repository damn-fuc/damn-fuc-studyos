import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().trim().min(1, '请输入任务名称').max(200, '任务名称最多 200 个字符'),
  description: z.string().max(5000, '描述最多 5000 个字符'),
  category: z.enum(['java', 'ai', 'research', 'other']),
  status: z.enum(['todo', 'doing', 'done', 'canceled']),
  priority: z.enum(['low', 'medium', 'high']),
  scheduled_date: z.string(),
  due_date: z.string(),
  project_id: z.string(),
  milestone_id: z.string(),
})

export type TaskFormValues = z.infer<typeof taskSchema>
