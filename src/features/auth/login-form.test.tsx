import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { LoginForm } from './login-form'

describe('LoginForm', () => {
  it('rejects an invalid email before calling Supabase sign-in', async () => {
    const user = userEvent.setup()
    const onSignIn = vi.fn(async () => undefined)

    render(<LoginForm onRequestReset={vi.fn(async () => undefined)} onSignIn={onSignIn} />)
    await user.type(screen.getByLabelText('邮箱'), 'invalid-email')
    await user.type(screen.getByLabelText('密码'), 'long-enough-password')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('请输入有效邮箱')).toBeVisible()
    expect(onSignIn).not.toHaveBeenCalled()
  })

  it('submits valid credentials and has no public registration action', async () => {
    const user = userEvent.setup()
    const onSignIn = vi.fn(async () => undefined)

    render(<LoginForm onRequestReset={vi.fn(async () => undefined)} onSignIn={onSignIn} />)
    await user.type(screen.getByLabelText('邮箱'), 'person@example.com')
    await user.type(screen.getByLabelText('密码'), 'correct-horse-battery')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(onSignIn).toHaveBeenCalledWith({ email: 'person@example.com', password: 'correct-horse-battery' })
    expect(screen.queryByRole('link', { name: /注册|创建账户/ })).not.toBeInTheDocument()
  })

  it('requests account recovery without revealing whether an email exists', async () => {
    const user = userEvent.setup()
    const onRequestReset = vi.fn(async () => undefined)

    render(<LoginForm onRequestReset={onRequestReset} onSignIn={vi.fn(async () => undefined)} />)
    await user.click(screen.getByRole('button', { name: '忘记密码？' }))
    await user.type(screen.getByLabelText('邮箱'), 'person@example.com')
    await user.click(screen.getByRole('button', { name: '发送恢复邮件' }))

    expect(onRequestReset).toHaveBeenCalledWith('person@example.com')
    expect(await screen.findByText('如果该邮箱已由管理员创建，恢复邮件会发送到该地址。')).toBeVisible()
  })
})
