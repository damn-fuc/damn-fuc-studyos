import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { newPasswordSchema, type NewPasswordValues } from '@/features/auth/auth-schemas'

type ResetPasswordFormProps = {
  onUpdate: (password: string) => Promise<void>
}

export function ResetPasswordForm({ onUpdate }: ResetPasswordFormProps) {
  const [requestError, setRequestError] = useState<string | null>(null)
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function submit(values: NewPasswordValues) {
    setRequestError(null)
    try {
      await onUpdate(values.password)
    } catch {
      setRequestError('密码暂时无法更新，请重新打开恢复邮件后重试。')
    }
  }

  return (
    <form className="space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="new-password">新密码</label>
        <Input
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.password)}
          id="new-password"
          type="password"
          {...form.register('password')}
        />
        {form.formState.errors.password?.message ? (
          <p className="text-xs text-destructive" role="alert">{form.formState.errors.password.message}</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="confirm-password">确认新密码</label>
        <Input
          autoComplete="new-password"
          aria-invalid={Boolean(form.formState.errors.confirmPassword)}
          id="confirm-password"
          type="password"
          {...form.register('confirmPassword')}
        />
        {form.formState.errors.confirmPassword?.message ? (
          <p className="text-xs text-destructive" role="alert">{form.formState.errors.confirmPassword.message}</p>
        ) : null}
      </div>
      {requestError ? <p className="text-sm text-destructive" role="alert">{requestError}</p> : null}
      <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
        {form.formState.isSubmitting ? '正在更新…' : '更新密码'}
      </Button>
    </form>
  )
}
