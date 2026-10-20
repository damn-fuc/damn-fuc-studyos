import { requireSupabaseClient } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate, TaskRow } from '@/types/database'
import type { TaskFormValues } from './task-schema'

export type TaskInput = Omit<TaskFormValues, 'scheduled_date' | 'due_date' | 'project_id' | 'milestone_id'> & {
  scheduled_date: string | null
  due_date: string | null
  project_id: string | null
  milestone_id: string | null
}

export async function listTasks(): Promise<TaskRow[]> {
  const { data, error } = await requireSupabaseClient()
    .from('tasks')
    .select('*')
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createTask(userId: string, input: TaskInput): Promise<TaskRow> {
  const payload: TablesInsert<'tasks'> = { user_id: userId, ...input }
  const { data, error } = await requireSupabaseClient().from('tasks').insert(payload).select('*').single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, input: TaskInput): Promise<TaskRow> {
  const payload: TablesUpdate<'tasks'> = input
  const { data, error } = await requireSupabaseClient().from('tasks').update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function updateTaskStatus(id: string, status: TaskRow['status']): Promise<void> {
  const { error } = await requireSupabaseClient().from('tasks').update({ status }).eq('id', id)
  if (error) throw error
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await requireSupabaseClient().from('tasks').delete().eq('id', id)
  if (error) throw error
}
