import { describe, expect, it } from 'vitest'

import { taskSchema } from '@/features/tasks/task-schema'

describe('task form validation', () => {
  it('requires a title and preserves explicitly entered dates', () => {
    const result = taskSchema.safeParse({
      title: 'Review Java streams', description: '', category: 'java', status: 'todo', priority: 'high',
      scheduled_date: '2024-01-02', due_date: '', project_id: '', milestone_id: '',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.scheduled_date).toBe('2024-01-02')
    expect(taskSchema.safeParse({ title: '', description: '', category: 'java', status: 'todo', priority: 'medium', scheduled_date: '', due_date: '', project_id: '', milestone_id: '' }).success).toBe(false)
  })
})
