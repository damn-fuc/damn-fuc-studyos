import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocked = vi.hoisted(() => ({
  useAuth: vi.fn(() => ({ user: { id: 'test-user' } })),
  listAllActivities: vi.fn(async () => []),
  listProjects: vi.fn(async () => []),
  listMilestones: vi.fn(async () => []),
  listTasks: vi.fn(async () => []),
  getUserSettings: vi.fn(async () => null),
}))

vi.mock('@/features/auth/auth-provider', () => ({ useAuth: mocked.useAuth }))
vi.mock('@/features/logs/logs-api', () => ({ listAllActivities: mocked.listAllActivities }))
vi.mock('@/features/projects/projects-api', () => ({ listProjects: mocked.listProjects, listMilestones: mocked.listMilestones }))
vi.mock('@/features/tasks/tasks-api', () => ({ listTasks: mocked.listTasks, createTask: vi.fn() }))
vi.mock('@/features/settings/settings-api', () => ({ getUserSettings: mocked.getUserSettings }))

import { DashboardPage } from './dashboard-page'

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an honest no-data state and links to the activity log', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: '今日工作台' })).toBeVisible()
    expect(screen.getByText('任务完成不会自动增加学习时长。')).toBeVisible()
    expect(screen.getByRole('link', { name: '打开学习日志' })).toHaveAttribute('href', '/logs')
    expect(await screen.findByText('还没有学习记录')).toBeVisible()
    expect(screen.queryByText(/120 分钟|已完成 4 项|连续 7 天/)).not.toBeInTheDocument()
  })
})
