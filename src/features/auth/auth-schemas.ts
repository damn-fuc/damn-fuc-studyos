import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().trim().email('请输入有效邮箱'),
  password: z.string().min(8, '密码至少需要 8 个字符'),
})

export const passwordRecoveryRequestSchema = z.object({
  email: z.string().trim().email('请输入有效邮箱'),
})

export const newPasswordSchema = z
  .object({
    password: z.string().min(8, '新密码至少需要 8 个字符'),
    confirmPassword: z.string().min(8, '请再次输入新密码'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type PasswordRecoveryRequestValues = z.infer<typeof passwordRecoveryRequestSchema>
export type NewPasswordValues = z.infer<typeof newPasswordSchema>
