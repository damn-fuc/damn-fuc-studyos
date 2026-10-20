import { requireSupabaseClient } from '@/lib/supabase'
import type { TablesInsert, UserSettingsRow } from '@/types/database'

export type SettingsInput = Pick<UserSettingsRow, 'display_name' | 'timezone' | 'weekly_goal_minutes' | 'theme'>

export async function getUserSettings(): Promise<UserSettingsRow | null> {
  const { data, error } = await requireSupabaseClient().from('user_settings').select('*').maybeSingle()
  if (error) throw error
  return data
}

export async function saveUserSettings(userId: string, input: SettingsInput): Promise<UserSettingsRow> {
  const payload: TablesInsert<'user_settings'> = { user_id: userId, ...input }
  const { data, error } = await requireSupabaseClient().from('user_settings').upsert(payload, { onConflict: 'user_id' }).select('*').single()
  if (error) throw error
  return data
}
