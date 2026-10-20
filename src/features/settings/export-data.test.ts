import { describe, expect, it } from 'vitest'

import { serializeExportCsv } from '@/features/settings/export-data'
import type { exportAllData } from '@/features/settings/export-data'

const exportData = {
  format_version: 1,
  exported_at: '2026-10-18T00:00:00.000Z',
  user_id: 'owner-id',
  projects: [{
    id: 'project-id', user_id: 'owner-id', name: '=HYPERLINK("https://example.test")', description: 'A, B', kind: 'research', status: 'active', goal: '',
    external_links: [{ label: 'Paper', url: 'https://example.test/paper' }], archived_at: null, created_at: '2026-10-18T00:00:00.000Z', updated_at: '2026-10-18T00:00:00.000Z',
  }],
  milestones: [], tasks: [], activity_logs: [], daily_reviews: [], weekly_reviews: [], user_settings: null,
} satisfies Awaited<ReturnType<typeof exportAllData>>

describe('CSV export', () => {
  it('retains table identity, record fields, and safely quotes spreadsheet values', () => {
    const csv = serializeExportCsv(exportData)
    expect(csv).toContain('"table_name"')
    expect(csv).toContain('"projects"')
    expect(csv).toContain('"user_id"')
    expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")"')
    expect(csv).toContain('"A, B"')
    expect(csv).toContain('"external_links"')
  })
})
