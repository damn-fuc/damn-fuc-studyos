import { describe, expect, it } from 'vitest'

import { activitySchema } from '@/features/logs/activity-schema'

const baseActivity = {
  activity_date: '2024-02-29', category: 'research' as const, title: 'Read a paper', content: '**Methods** section',
  duration_minutes: 0, notes: '- compare baselines', project_id: '',
}

describe('activity form validation', () => {
  it('allows historical records and nonnegative whole minutes', () => {
    expect(activitySchema.safeParse(baseActivity).success).toBe(true)
    expect(activitySchema.safeParse({ ...baseActivity, duration_minutes: 90 }).success).toBe(true)
  })

  it('rejects negative and fractional durations', () => {
    expect(activitySchema.safeParse({ ...baseActivity, duration_minutes: -1 }).success).toBe(false)
    expect(activitySchema.safeParse({ ...baseActivity, duration_minutes: 12.5 }).success).toBe(false)
  })
})
