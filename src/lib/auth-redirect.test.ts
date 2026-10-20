import { describe, expect, it } from 'vitest'

import { buildAuthRedirectUrl } from './auth-redirect'

describe('buildAuthRedirectUrl', () => {
  it('returns the Pages app root without a HashRouter fragment', () => {
    expect(buildAuthRedirectUrl('https://alice.github.io', '/studyos/')).toBe('https://alice.github.io/studyos/')
  })

  it('normalizes the local app root and never carries a hash route into auth', () => {
    expect(buildAuthRedirectUrl('http://127.0.0.1:5173', '/studyos/#/login')).toBe('http://127.0.0.1:5173/studyos/')
  })
})
