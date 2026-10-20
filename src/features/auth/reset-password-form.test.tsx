import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ResetPasswordForm } from './reset-password-form'

describe('ResetPasswordForm', () => {
  it('rejects mismatched passwords before updating the account', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn(async () => undefined)

    render(<ResetPasswordForm onUpdate={onUpdate} />)
    await user.type(screen.getByLabelText('新密码'), 'new-password-one')
    await user.type(screen.getByLabelText('确认新密码'), 'new-password-two')
    await user.click(screen.getByRole('button', { name: '更新密码' }))

    expect(await screen.findByText('两次输入的密码不一致')).toBeVisible()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('submits a matching new password and confirms success', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn(async () => undefined)

    render(<ResetPasswordForm onUpdate={onUpdate} />)
    await user.type(screen.getByLabelText('新密码'), 'new-password-one')
    await user.type(screen.getByLabelText('确认新密码'), 'new-password-one')
    await user.click(screen.getByRole('button', { name: '更新密码' }))

    expect(onUpdate).toHaveBeenCalledWith('new-password-one')
  })
})
