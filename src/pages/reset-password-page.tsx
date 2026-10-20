import { useState } from 'react'
import { BookOpenCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Navigate, useNavigate } from 'react-router-dom'

import { LoadingState } from '@/components/feedback/loading-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ResetPasswordForm } from '@/features/auth/reset-password-form'
import { useAuth } from '@/features/auth/auth-provider'

export function ResetPasswordPage() {
  const { finishPasswordRecovery, isConfigured, isLoading, recoveryMode, updatePassword, user } = useAuth()
  const navigate = useNavigate()
  const [isUpdating, setIsUpdating] = useState(false)

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md"><LoadingState label="正在验证恢复链接" rows={2} /></div>
      </main>
    )
  }

  if (!isConfigured || !user || !recoveryMode) return <Navigate replace to="/login" />

  async function handleUpdate(password: string) {
    setIsUpdating(true)
    try {
      await updatePassword(password)
      finishPasswordRecovery()
      toast.success('密码已更新')
      navigate('/', { replace: true })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BookOpenCheck aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-lg font-semibold tracking-[-0.02em]">StudyOS</p>
            <p className="text-xs text-muted-foreground">Personal Learning &amp; Research Workspace</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">设置新密码</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-5 text-sm leading-6 text-muted-foreground">为你的私人账户设置一个新的登录密码。</p>
            <ResetPasswordForm onUpdate={handleUpdate} />
            {isUpdating ? <p className="sr-only" role="status">正在更新密码</p> : null}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
