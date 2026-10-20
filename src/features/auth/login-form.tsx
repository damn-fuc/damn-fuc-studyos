import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  loginSchema,
  passwordRecoveryRequestSchema,
  type LoginValues,
} from '@/features/auth/auth-schemas'

type LoginFormProps = {
  onSignIn: (values: LoginValues) => Promise<void>
  onRequestReset: (email: string) => Promise<void>
}

type FormMode = 'login' | 'recover'

export function LoginForm({ onSignIn, onRequestReset }: LoginFormProps) {
  const [mode, setMode] = useState<FormMode>('login')
  const [message, setMessage] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const recoveryForm = useForm<{ email: string }>({
    resolver: zodResolver(passwordRecoveryRequestSchema),
    defaultValues: { email: '' },
  })

  async function submitLogin(values: LoginValues) {
    setMessage(null)
    setRequestError(null)
    try {
      await onSignIn(values)
    } catch {
      setRequestError('邮箱或密码不正确，或账户暂时无法登录。')
    }
  }

  async function submitRecovery(values: { email: string }) {
    setMessage(null)
    setRequestError(null)
    try {
      await onRequestReset(values.email)
      setMessage('如果该邮箱已由管理员创建，恢复邮件会发送到该地址。')
    } catch {
      setRequestError('暂时无法发送恢复邮件，请稍后重试。')
    }
  }

  function switchMode(nextMode: FormMode) {
    setRequestError(null)
    setMessage(null)
    setMode(nextMode)
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-[-0.025em] text-foreground">
          {mode === 'login' ? '登录 StudyOS' : '恢复账户'}
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          {mode === 'login' ? '使用管理员创建的邮箱账户继续。' : '输入账户邮箱以接收安全恢复链接。'}
        </p>
      </div>

      {mode === 'login' ? (
        <form className="space-y-4" noValidate onSubmit={loginForm.handleSubmit(submitLogin)}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="login-email">邮箱</label>
            <Input
              autoComplete="username"
              aria-invalid={Boolean(loginForm.formState.errors.email)}
              id="login-email"
              inputMode="email"
              placeholder="name@example.com"
              type="email"
              {...loginForm.register('email')}
            />
            {loginForm.formState.errors.email?.message ? (
              <p className="text-xs text-destructive" role="alert">{loginForm.formState.errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium" htmlFor="login-password">密码</label>
              <button className="text-xs font-medium text-primary hover:underline" onClick={() => switchMode('recover')} type="button">
                忘记密码？
              </button>
            </div>
            <Input
              autoComplete="current-password"
              aria-invalid={Boolean(loginForm.formState.errors.password)}
              id="login-password"
              placeholder="输入密码"
              type="password"
              {...loginForm.register('password')}
            />
            {loginForm.formState.errors.password?.message ? (
              <p className="text-xs text-destructive" role="alert">{loginForm.formState.errors.password.message}</p>
            ) : null}
          </div>
          {requestError ? <p className="text-sm text-destructive" role="alert">{requestError}</p> : null}
          <Button className="w-full" disabled={loginForm.formState.isSubmitting} type="submit">
            {loginForm.formState.isSubmitting ? '正在登录…' : '登录'}
          </Button>
        </form>
      ) : (
        <form className="space-y-4" noValidate onSubmit={recoveryForm.handleSubmit(submitRecovery)}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="recovery-email">邮箱</label>
            <Input
              autoComplete="email"
              aria-invalid={Boolean(recoveryForm.formState.errors.email)}
              id="recovery-email"
              inputMode="email"
              placeholder="name@example.com"
              type="email"
              {...recoveryForm.register('email')}
            />
            {recoveryForm.formState.errors.email?.message ? (
              <p className="text-xs text-destructive" role="alert">{recoveryForm.formState.errors.email.message}</p>
            ) : null}
          </div>
          {message ? <p className="text-sm leading-6 text-foreground" role="status">{message}</p> : null}
          {requestError ? <p className="text-sm text-destructive" role="alert">{requestError}</p> : null}
          <Button className="w-full" disabled={recoveryForm.formState.isSubmitting} type="submit">
            {recoveryForm.formState.isSubmitting ? '正在发送…' : '发送恢复邮件'}
          </Button>
          <button className="w-full py-1 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={() => switchMode('login')} type="button">
            返回登录
          </button>
        </form>
      )}
    </div>
  )
}
