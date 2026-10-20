import { BookOpenCheck, CloudCog, LockKeyhole } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingState } from '@/components/feedback/loading-state'
import { useAuth } from '@/features/auth/auth-provider'
import { LoginForm } from '@/features/auth/login-form'

export function LoginPage() {
  const { isConfigured, isLoading, requestPasswordRecovery, signIn, user } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from
  const returnTo = from?.pathname ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/'

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md"><LoadingState label="正在检查登录状态" rows={2} /></div>
      </main>
    )
  }

  if (user) return <Navigate replace to={returnTo} />

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
            <CardTitle className="text-lg">私人学习空间</CardTitle>
          </CardHeader>
          <CardContent>
            {isConfigured ? (
              <LoginForm onRequestReset={requestPasswordRecovery} onSignIn={signIn} />
            ) : (
              <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <CloudCog aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-medium">云端认证尚未连接</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      在本地 `.env.local` 或 GitHub Actions Variables 中配置 Supabase URL 和 Publishable Key 后，即可使用管理员创建的邮箱账户登录。
                    </p>
                  </div>
                </div>
              </div>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs leading-5 text-muted-foreground">
              <LockKeyhole aria-hidden="true" className="size-3.5 shrink-0" />
              网站不开放注册。未登录时不会读取个人学习与科研数据。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
