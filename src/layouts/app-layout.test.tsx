import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppLayout } from './app-layout'

describe('AppLayout', () => {
  it('provides desktop and five-item mobile navigation with a real quick-log link', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="*"
            element={
              <AppLayout>
                <p>页面内容</p>
              </AppLayout>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    const desktopNav = within(screen.getByRole('navigation', { name: '桌面主导航' }))
    expect(desktopNav.getByRole('link', { name: '工作台' })).toHaveAttribute('href', '/')
    expect(desktopNav.getByRole('link', { name: '任务' })).toHaveAttribute('href', '/tasks')
    expect(desktopNav.getByRole('link', { name: '学习日志' })).toHaveAttribute('href', '/logs')
    expect(desktopNav.getByRole('link', { name: '项目中心' })).toHaveAttribute('href', '/projects')
    expect(desktopNav.getByRole('link', { name: '数据统计' })).toHaveAttribute('href', '/analytics')
    expect(screen.getByRole('navigation', { name: '手机主导航' }).querySelectorAll('a')).toHaveLength(5)
    expect(screen.getByRole('link', { name: /记录学习/ })).toHaveAttribute('href', '/logs?new=1')
    expect(screen.getByRole('main')).toHaveTextContent('页面内容')
  })
})
