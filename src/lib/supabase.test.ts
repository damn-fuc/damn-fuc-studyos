import { describe, expect, it } from 'vitest'

import { createSupabaseClient } from './supabase'

describe('createSupabaseClient', () => {
  it('does not create a client with missing or example credentials', () => {
    expect(createSupabaseClient(undefined, undefined)).toBeNull()
    expect(createSupabaseClient('https://your-project-ref.supabase.co', 'sb_publishable_your-public-key')).toBeNull()
  })

  it('accepts only a project URL and a publishable key', () => {
    const client = createSupabaseClient('https://studyos-test.supabase.co', 'sb_publishable_test_value')

    expect(client).not.toBeNull()
    expect(client?.auth).toBeDefined()
  })
})
