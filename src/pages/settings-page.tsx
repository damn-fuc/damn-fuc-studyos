import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTheme } from '@/features/theme/theme-provider'
import { LogOut, Monitor, Moon, Sun, Download, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { ErrorState } from '@/components/feedback/error-state'
import { LoadingState } from '@/components/feedback/loading-state'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/auth-provider'
import { downloadTextFile, exportAllData, serializeExportCsv } from '@/features/settings/export-data'
import { getUserSettings, saveUserSettings } from '@/features/settings/settings-api'
import { queryKeys } from '@/lib/query-keys'
import type { ThemePreference } from '@/types/database'

const schema = z.object({
  display_name: z.string().max(80, '最多 80 个字符'),
  timezone: z.string().min(1, '请选择时区').refine((value) => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true } catch { return false } }, '请选择有效的时区'),
  weekly_goal_minutes: z.number().int('请输入整数分钟数').min(0, '目标不能为负数').max(10080, '每周目标最多 10080 分钟'),
  theme: z.enum(['light', 'dark', 'system']),
})
type FormValues = z.infer<typeof schema>

const timezones = [
  ['Asia/Shanghai', '北京时间（Asia/Shanghai）'], ['Asia/Tokyo', '东京（Asia/Tokyo）'], ['Asia/Singapore', '新加坡（Asia/Singapore）'],
  ['UTC', '协调世界时（UTC）'], ['Europe/London', '伦敦（Europe/London）'], ['America/Los_Angeles', '洛杉矶（America/Los_Angeles）'],
  ['America/New_York', '纽约（America/New_York）'],
] as const

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { setTheme, theme } = useTheme()
  const userId = user?.id ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const settingsQuery = useQuery({ queryKey: queryKeys.settings(userId), queryFn: getUserSettings, enabled: Boolean(userId) })
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { display_name: '', timezone: 'Asia/Shanghai', weekly_goal_minutes: 600, theme: 'system' } })
  const [isExporting, setIsExporting] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    if (!settingsQuery.isSuccess) return
    const row = settingsQuery.data
    form.reset({ display_name: row?.display_name ?? '', timezone: row?.timezone ?? 'Asia/Shanghai', weekly_goal_minutes: row?.weekly_goal_minutes ?? 600, theme: row?.theme ?? 'system' })
    if (row?.theme) setTheme(row.theme)
  }, [form, settingsQuery.data, settingsQuery.isSuccess, setTheme])

  const saveMutation = useMutation({
    mutationFn: (values: FormValues) => saveUserSettings(userId, values),
    onSuccess: async (row) => { setTheme(row.theme); await queryClient.invalidateQueries({ queryKey: queryKeys.settings(userId) }); toast.success('个人设置已保存') },
    onError: () => toast.error('个人设置保存失败，请检查网络后重试。'),
  })

  async function exportData(format: 'json' | 'csv') {
    setIsExporting(true)
    try {
      const data = await exportAllData(userId)
      const date = new Date().toISOString().slice(0, 10)
      if (format === 'json') downloadTextFile(`studyos-export-${date}.json`, JSON.stringify(data, null, 2), 'application/json;charset=utf-8')
      else downloadTextFile(`studyos-export-${date}.csv`, `\uFEFF${serializeExportCsv(data)}`, 'text/csv;charset=utf-8')
      toast.success(format === 'json' ? 'JSON 数据已导出' : 'CSV 数据已导出')
    } catch {
      toast.error('数据导出失败，请检查 Supabase 连接后重试。')
    } finally {
      setIsExporting(false)
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    try { await signOut(); navigate('/login', { replace: true }) }
    catch { toast.error('退出登录失败，请检查网络后重试。') }
    finally { setIsSigningOut(false) }
  }

  const selectedTheme = form.watch('theme')
  const chooseTheme = (value: ThemePreference) => { form.setValue('theme', value, { shouldDirty: true }); setTheme(value) }

  return <div className="space-y-5">
    <PageHeader description="管理账户信息、时区、每周目标、主题与数据备份。" title="个人设置" />
    {settingsQuery.isPending ? <LoadingState label="正在加载个人设置" rows={3} /> : null}
    {settingsQuery.isError ? <ErrorState description="个人设置暂时无法读取。" onRetry={() => void settingsQuery.refetch()} /> : null}
    {settingsQuery.isSuccess ? <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <Card><CardHeader><CardTitle className="text-base">学习偏好</CardTitle><CardDescription>日期统计采用这里设置的时区。默认时区为北京时间。</CardDescription></CardHeader><CardContent>
          <form className="space-y-5" noValidate onSubmit={form.handleSubmit(async (values) => saveMutation.mutateAsync(values))}>
            <label className="block space-y-1.5 text-sm font-medium">显示名称<Input autoComplete="name" maxLength={80} placeholder="你的名字或昵称" {...form.register('display_name')} />{form.formState.errors.display_name?.message ? <span className="text-xs text-destructive">{form.formState.errors.display_name.message}</span> : null}</label>
            <label className="block space-y-1.5 text-sm font-medium">统计时区<select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" {...form.register('timezone')}>{timezones.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="block space-y-1.5 text-sm font-medium">每周学习目标（分钟）<Input inputMode="numeric" max={10080} min={0} type="number" {...form.register('weekly_goal_minutes', { valueAsNumber: true })} />{form.formState.errors.weekly_goal_minutes?.message ? <span className="text-xs text-destructive">{form.formState.errors.weekly_goal_minutes.message}</span> : <span className="block text-xs font-normal text-muted-foreground">默认每周 600 分钟（10 小时），设为 0 可关闭目标。</span>}</label>
            <div className="space-y-2"><p className="text-sm font-medium">主题</p><div className="flex flex-wrap gap-2"><Button aria-pressed={selectedTheme === 'light'} onClick={() => chooseTheme('light')} type="button" variant={selectedTheme === 'light' ? 'default' : 'outline'}><Sun aria-hidden="true" className="size-4" />浅色</Button><Button aria-pressed={selectedTheme === 'dark'} onClick={() => chooseTheme('dark')} type="button" variant={selectedTheme === 'dark' ? 'default' : 'outline'}><Moon aria-hidden="true" className="size-4" />深色</Button><Button aria-pressed={selectedTheme === 'system'} onClick={() => chooseTheme('system')} type="button" variant={selectedTheme === 'system' ? 'default' : 'outline'}><Monitor aria-hidden="true" className="size-4" />跟随系统</Button></div><span className="sr-only">当前主题 {theme ?? selectedTheme}</span></div>
            <Button disabled={saveMutation.isPending || !form.formState.isDirty} type="submit">{saveMutation.isPending ? '正在保存…' : '保存个人设置'}</Button>
          </form>
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><UserRound aria-hidden="true" className="size-4" />账户</CardTitle><CardDescription>此应用不提供公开注册。</CardDescription></CardHeader><CardContent className="space-y-4"><div className="rounded-lg border bg-muted/25 p-3"><p className="text-xs text-muted-foreground">登录邮箱</p><p className="mt-1 break-all text-sm font-medium">{user?.email ?? '未提供'}</p></div><div className="rounded-lg border bg-muted/25 p-3"><p className="text-xs text-muted-foreground">账户 ID</p><p className="mt-1 break-all font-mono text-xs">{userId}</p></div><Button disabled={isSigningOut} onClick={() => void handleSignOut()} variant="outline"><LogOut aria-hidden="true" className="size-4" />{isSigningOut ? '正在退出…' : '退出登录'}</Button></CardContent></Card>
      </div>
      <Card><CardHeader><CardTitle className="text-base">数据导出</CardTitle><CardDescription>导出本人 RLS 可访问的全部项目、里程碑、任务、活动、每日/每周复盘和个人设置。</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2"><Button disabled={isExporting} onClick={() => void exportData('json')}><Download aria-hidden="true" className="size-4" />导出 JSON</Button><Button disabled={isExporting} onClick={() => void exportData('csv')} variant="outline"><Download aria-hidden="true" className="size-4" />导出 CSV</Button>{isExporting ? <p className="self-center text-xs text-muted-foreground" role="status">正在读取云端数据…</p> : null}</CardContent></Card>
    </> : null}
  </div>
}
