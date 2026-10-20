import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173/studyos/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1',
    env: {
      ...process.env,
      VITE_SUPABASE_URL: 'https://studyos-e2e.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_e2e-only',
    },
    url: 'http://127.0.0.1:5173/studyos/',
    reuseExistingServer: !process.env['CI'],
    timeout: 60_000,
  },
})
