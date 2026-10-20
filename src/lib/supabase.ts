import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

const placeholderPattern = /your-project-ref|your-public-key|replace-me/i
const secretPattern = /^(sb_secret_|service_role)/i

function isValidProjectUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export function createSupabaseClient(
  projectUrl: string | undefined,
  publishableKey: string | undefined,
): SupabaseClient<Database> | null {
  const url = projectUrl?.trim()
  const key = publishableKey?.trim()

  if (
    !url ||
    !key ||
    !isValidProjectUrl(url) ||
    placeholderPattern.test(url) ||
    placeholderPattern.test(key) ||
    secretPattern.test(key)
  ) {
    return null
  }

  return createClient<Database>(url, key, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase = createSupabaseClient(
  import.meta.env['VITE_SUPABASE_URL'],
  import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'],
)

export const isSupabaseConfigured = supabase !== null

export function requireSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) throw new Error('Supabase 尚未配置。')
  return supabase
}
