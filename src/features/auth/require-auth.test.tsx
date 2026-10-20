import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AuthProvider } from './auth-provider'
import { RequireAuth } from './require-auth'

describe('RequireAuth', () => {
  it('redirects to login when the Supabase client is not configured', async () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider client={null}>
          <MemoryRouter initialEntries={['/private']}>
            <Routes>
              <Route element={<RequireAuth><p>私人学习数据</p></RequireAuth>} path="/private" />
              <Route element={<p>请登录或配置 Supabase</p>} path="/login" />
            </Routes>
          </MemoryRouter>
        </AuthProvider>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('请登录或配置 Supabase')).toBeVisible()
    expect(screen.queryByText('私人学习数据')).not.toBeInTheDocument()
  })
})
