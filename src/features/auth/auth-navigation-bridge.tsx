import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/auth-provider'

export function AuthNavigationBridge() {
  const { isConfigured, isLoading, recoveryMode } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isConfigured && !isLoading && recoveryMode) {
      navigate('/reset-password', { replace: true })
    }
  }, [isConfigured, isLoading, navigate, recoveryMode])

  return null
}
