import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { LoadingState } from '@/components/feedback/loading-state'
import { useAuth } from '@/features/auth/auth-provider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isConfigured, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
        <LoadingState label="正在验证登录状态" rows={2} />
      </main>
    )
  }

  if (!isConfigured || !user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return children
}
