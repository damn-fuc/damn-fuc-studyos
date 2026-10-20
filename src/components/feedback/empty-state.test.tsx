import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('explains the empty state and runs only its explicit action', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()

    render(
      <EmptyState
        title="还没有学习记录"
        description="记录一次学习后，这里会显示真实活动。"
        actionLabel="记录学习"
        onAction={onAction}
      />,
    )

    expect(screen.getByRole('heading', { name: '还没有学习记录' })).toBeVisible()
    expect(screen.getByText('记录一次学习后，这里会显示真实活动。')).toBeVisible()
    await user.click(screen.getByRole('button', { name: '记录学习' }))
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('does not render a button when no action is provided', () => {
    render(<EmptyState title="暂无项目" description="创建一个项目后再关联任务。" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
