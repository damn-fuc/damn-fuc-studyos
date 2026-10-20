import { expect, test } from '@playwright/test'
import { Buffer } from 'node:buffer'
import type { Page, Route } from '@playwright/test'

async function mockAuthenticatedOwner(page: Page) {
  const nowSeconds = Math.floor(Date.now() / 1000)
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'owner@example.test',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { display_name: 'Owner' },
    identities: [],
    created_at: new Date(nowSeconds * 1000).toISOString(),
  }
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const accessToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
    sub: user.id, aud: 'authenticated', role: 'authenticated', email: user.email,
    iat: nowSeconds, exp: nowSeconds + 3600, session_id: 'studyos-e2e-session', is_anonymous: false,
  })}.e2e-signature`
  const session = { access_token: accessToken, refresh_token: 'studyos-e2e-refresh', expires_in: 3600, expires_at: nowSeconds + 3600, token_type: 'bearer', user }
  await page.addInitScript(({ storageKey, value }) => localStorage.setItem(storageKey, JSON.stringify(value)), {
    storageKey: 'sb-studyos-e2e-auth-token',
    value: session,
  })
  const activityDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai' }).format(new Date())
  const activity = [{
    id: '33333333-3333-4333-8333-333333333333', user_id: user.id, activity_date: activityDate,
    category: 'research', title: 'Test activity', content: 'Synthetic browser test record', duration_minutes: 35,
    notes: '', project_id: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }]
  await page.route('**/rest/v1/**', (route) => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1)
    const body = table === 'activity_logs' ? activity : []
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '0-0/*' }, body: JSON.stringify(body) })
  })
}

type MockRow = Record<string, unknown>

async function mockMutableSupabase(page: Page) {
  await mockAuthenticatedOwner(page)
  await page.unroute('**/rest/v1/**')
  const state: Record<string, MockRow[]> = {}
  let sequence = 0
  await page.route('**/rest/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const table = url.pathname.split('/').at(-1) ?? ''
    const rows = state[table] ?? (state[table] = [])
    const idFilter = url.searchParams.get('id')
    const id = idFilter?.startsWith('eq.') ? idFilter.slice(3) : null

    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` }, body: JSON.stringify(rows) })
    }

    if (request.method() === 'POST') {
      const raw = request.postDataJSON() as MockRow | MockRow[]
      const payloads = Array.isArray(raw) ? raw : [raw]
      const written = payloads.map((payload) => {
        const conflictFields = url.searchParams.get('on_conflict')?.split(',') ?? []
        const existing = conflictFields.length > 0 ? rows.find((row) => conflictFields.every((field) => row[field] === payload[field])) : undefined
        const now = new Date().toISOString()
        const defaults: Record<string, MockRow> = {
          projects: { archived_at: null, external_links: [] },
          milestones: { sort_order: 0 },
          tasks: { completed_at: null },
        }
        const row: MockRow = existing
          ? { ...existing, ...payload, updated_at: now }
          : { ...(defaults[table] ?? {}), id: `e2e-${++sequence}`, created_at: now, updated_at: now, ...payload }
        if (existing) Object.assign(existing, row)
        else rows.push(row)
        return existing ?? row
      })
      return fulfillMutation(route, written)
    }

    if (request.method() === 'PATCH') {
      const payload = request.postDataJSON() as MockRow
      const selectedRows = rows.filter((row) => id === null || row.id === id)
      for (const row of selectedRows) {
        Object.assign(row, payload, { updated_at: new Date().toISOString() })
        if (table === 'tasks' && payload.status === 'done' && !row.completed_at) row.completed_at = new Date().toISOString()
      }
      return fulfillMutation(route, selectedRows)
    }

    if (request.method() === 'DELETE') {
      state[table] = rows.filter((row) => id === null || row.id !== id)
      return route.fulfill({ status: 204 })
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })
  return state
}

function fulfillMutation(route: Route, rows: MockRow[]) {
  if (route.request().headers()['prefer']?.includes('return=minimal')) return route.fulfill({ status: 204 })
  const selected = route.request().headers()['accept']?.includes('application/vnd.pgrst.object+json')
  const body = selected && rows[0] ? rows[0] : rows
  return route.fulfill({ status: 201, contentType: 'application/json', headers: { 'content-range': `0-${Math.max(rows.length - 1, 0)}/${rows.length}` }, body: JSON.stringify(body) })
}

test('redirects an unauthenticated browser session to email login', async ({ page }) => {
  await page.goto('#/tasks')
  await expect(page).toHaveURL(/#\/login$/)
  await expect(page.getByRole('heading', { name: '登录 StudyOS' })).toBeVisible()
  await expect(page.getByLabel('邮箱')).toBeVisible()
  await expect(page.getByLabel('密码')).toBeVisible()
  await expect(page.getByRole('link', { name: /注册|创建账户/ })).toHaveCount(0)
})

for (const width of [360, 390, 430]) {
  test(`login layout has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('#/login')
    await expect(page.getByRole('heading', { name: '私人学习空间' })).toBeVisible()
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(documentWidth).toBeLessThanOrEqual(width)
  })

  test(`protected workspace fits ${width}px and exposes mobile navigation`, async ({ page }) => {
    await mockAuthenticatedOwner(page)
    await page.setViewportSize({ width, height: 844 })
    await page.goto('#/')
    await expect(page.getByRole('heading', { name: '今日工作台' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: '手机主导航' })).toBeVisible()
    await expect(page.getByRole('link', { name: '个人设置' })).toBeVisible()
    await expect(page.getByRole('link', { name: '本周复盘' })).toBeVisible()
    const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(documentWidth).toBeLessThanOrEqual(width)
  })
}

test('desktop workspace uses the sidebar layout without overflow', async ({ page }) => {
  await mockAuthenticatedOwner(page)
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('#/')
  await expect(page.getByRole('heading', { name: '今日工作台' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: '桌面主导航' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: '手机主导航' })).toBeHidden()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440)
})

test('analytics route lazy-loads and renders registered ECharts modules', async ({ page }) => {
  await mockAuthenticatedOwner(page)
  await page.setViewportSize({ width: 1440, height: 960 })
  await page.goto('#/analytics')
  await expect(page.getByRole('heading', { name: '数据统计' })).toBeVisible()
  await expect.poll(() => page.locator('canvas').count()).toBeGreaterThanOrEqual(4)
})

test('task create, edit, status update, and confirmed delete use persisted rows', async ({ page }) => {
  const database = await mockMutableSupabase(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('#/tasks')
  await expect(page.getByRole('heading', { name: '任务', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '新增任务' }).click()
  await page.getByLabel('任务名称').fill('Playwright 科研任务')
  await page.getByLabel('计划日期').fill('2026-10-19')
  await page.getByRole('button', { name: '创建任务' }).click()
  await expect(page.getByRole('heading', { name: 'Playwright 科研任务' })).toBeVisible()
  await expect.poll(() => database.tasks?.length).toBe(1)
  expect(database.tasks?.[0]?.scheduled_date).toBe('2026-10-19')

  await page.getByRole('button', { name: '编辑 Playwright 科研任务' }).click()
  await page.getByLabel('任务名称').fill('已更新的科研任务')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByRole('heading', { name: '已更新的科研任务' })).toBeVisible()
  await page.getByLabel('更改 已更新的科研任务 状态').selectOption('done')
  await expect.poll(() => database.tasks?.[0]?.status).toBe('done')

  page.on('dialog', async (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除 已更新的科研任务' }).click()
  await expect.poll(() => database.tasks?.length).toBe(0)
})

test('project milestones link to tasks and learning activities', async ({ page }) => {
  const database = await mockMutableSupabase(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('#/projects')
  await page.getByRole('button', { name: '新建项目' }).click()
  await page.getByLabel('项目名称').fill('Playwright 论文项目')
  await page.getByLabel('项目类型').selectOption('research')
  await page.getByRole('button', { name: '创建项目' }).click()
  await expect.poll(() => database.projects?.length).toBe(1)

  await page.getByRole('button', { name: '新增', exact: true }).click()
  await page.getByLabel('名称').fill('数据分析阶段')
  await page.getByRole('button', { name: '创建里程碑' }).click()
  await expect.poll(() => database.milestones?.length).toBe(1)
  const projectId = database.projects?.[0]?.id
  const milestoneId = database.milestones?.[0]?.id
  expect(database.milestones?.[0]?.project_id).toBe(projectId)

  await page.goto('#/tasks')
  await page.getByRole('button', { name: '新增任务' }).click()
  await page.getByLabel('任务名称').fill('关联里程碑任务')
  await page.getByLabel('关联项目').selectOption(String(projectId))
  await page.getByLabel('里程碑').selectOption(String(milestoneId))
  await page.getByRole('button', { name: '创建任务' }).click()
  await expect(page.getByRole('heading', { name: '关联里程碑任务' })).toBeVisible()
  expect(database.tasks?.[0]?.project_id).toBe(projectId)
  expect(database.tasks?.[0]?.milestone_id).toBe(milestoneId)

  await page.goto('#/logs')
  await page.getByRole('button', { name: '记录学习' }).click()
  await page.getByLabel('活动名称').fill('项目阅读记录')
  await page.getByLabel('时长（分钟）').fill('42')
  await page.getByLabel('关联项目').selectOption(String(projectId))
  await page.getByRole('button', { name: '保存记录' }).click()
  await expect(page.getByRole('heading', { name: '项目阅读记录' })).toBeVisible()
  expect(database.activity_logs?.[0]?.duration_minutes).toBe(42)
  expect(database.activity_logs?.[0]?.project_id).toBe(projectId)

  await page.getByRole('button', { name: '编辑 项目阅读记录' }).click()
  await page.getByLabel('活动名称').fill('更新后的项目阅读记录')
  await page.getByLabel('时长（分钟）').fill('60')
  await page.getByRole('button', { name: '保存修改' }).click()
  await expect(page.getByRole('heading', { name: '更新后的项目阅读记录' })).toBeVisible()
  expect(database.activity_logs?.[0]?.duration_minutes).toBe(60)
  page.on('dialog', async (dialog) => dialog.accept())
  await page.getByRole('button', { name: '删除 更新后的项目阅读记录' }).click()
  await expect.poll(() => database.activity_logs?.length).toBe(0)
})

test('daily and weekly reviews upsert without duplicate date rows', async ({ page }) => {
  const database = await mockMutableSupabase(page)
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('#/logs')
  await page.getByLabel('今日收获').fill('复习了研究方法')
  await page.getByRole('button', { name: '保存每日复盘' }).click()
  await expect.poll(() => database.daily_reviews?.length).toBe(1)
  await page.getByLabel('今日收获').fill('完成并整理研究方法笔记')
  await page.getByRole('button', { name: '保存每日复盘' }).click()
  await expect.poll(() => database.daily_reviews?.[0]?.wins).toBe('完成并整理研究方法笔记')
  expect(database.daily_reviews?.[0]?.review_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)

  await page.goto('#/weekly')
  await page.getByLabel('本周成果').fill('完成阶段性实验')
  await page.getByRole('button', { name: '保存周复盘' }).click()
  await expect.poll(() => database.weekly_reviews?.length).toBe(1)
  await page.getByLabel('本周成果').fill('完成并复核阶段性实验')
  await page.getByRole('button', { name: '保存周复盘' }).click()
  await expect.poll(() => database.weekly_reviews?.[0]?.outcomes).toBe('完成并复核阶段性实验')
  expect(database.weekly_reviews?.[0]?.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/)
})

test('theme provider does not render a React script tag warning', async ({ page }) => {
  const scriptWarnings: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && message.text().includes('Encountered a script tag while rendering React component')) {
      scriptWarnings.push(message.text())
    }
  })
  await page.goto('#/login')
  await expect(page.getByRole('heading', { name: '登录 StudyOS' })).toBeVisible()
  expect(scriptWarnings).toEqual([])
})
