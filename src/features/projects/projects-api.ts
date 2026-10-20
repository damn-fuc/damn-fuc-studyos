import { requireSupabaseClient } from '@/lib/supabase'
import type { MilestoneRow, ProjectRow, TablesInsert, TablesUpdate } from '@/types/database'

export type ProjectInput = Pick<ProjectRow, 'name' | 'description' | 'kind' | 'status' | 'goal' | 'external_links'>
export type MilestoneInput = Pick<MilestoneRow, 'project_id' | 'title' | 'description' | 'due_date' | 'status'>

export async function listProjects(): Promise<ProjectRow[]> {
  const { data, error } = await requireSupabaseClient()
    .from('projects')
    .select('*')
    .order('archived_at', { ascending: true, nullsFirst: true })
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listMilestones(): Promise<MilestoneRow[]> {
  const { data, error } = await requireSupabaseClient()
    .from('milestones')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createProject(userId: string, input: ProjectInput): Promise<ProjectRow> {
  const payload: TablesInsert<'projects'> = { user_id: userId, ...input }
  const { data, error } = await requireSupabaseClient().from('projects').insert(payload).select('*').single()
  if (error) throw error
  return data
}

export async function updateProject(id: string, input: ProjectInput): Promise<ProjectRow> {
  const payload: TablesUpdate<'projects'> = input
  const { data, error } = await requireSupabaseClient().from('projects').update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function setProjectArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await requireSupabaseClient().from('projects').update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id)
  if (error) throw error
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await requireSupabaseClient().from('projects').delete().eq('id', id)
  if (error) throw error
}

export async function createMilestone(userId: string, input: MilestoneInput): Promise<MilestoneRow> {
  const payload: TablesInsert<'milestones'> = { user_id: userId, ...input }
  const { data, error } = await requireSupabaseClient().from('milestones').insert(payload).select('*').single()
  if (error) throw error
  return data
}

export async function updateMilestone(id: string, input: MilestoneInput): Promise<MilestoneRow> {
  const payload: TablesUpdate<'milestones'> = input
  const { data, error } = await requireSupabaseClient().from('milestones').update(payload).eq('id', id).select('*').single()
  if (error) throw error
  return data
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await requireSupabaseClient().from('milestones').delete().eq('id', id)
  if (error) throw error
}
