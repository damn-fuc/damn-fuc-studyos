import type { ReactNode } from 'react'
import {
  BookOpenCheck,
  CalendarCheck,
  ChartNoAxesColumn,
  CheckSquare2,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Settings2,
} from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type NavigationItem = {
  label: string
  to: string
  icon: typeof LayoutDashboard
}

const primaryItems: NavigationItem[] = [
  { label: '工作台', to: '/', icon: LayoutDashboard },
  { label: '任务', to: '/tasks', icon: CheckSquare2 },
  { label: '学习日志', to: '/logs', icon: BookOpenCheck },
  { label: '项目中心', to: '/projects', icon: FolderKanban },
  { label: '数据统计', to: '/analytics', icon: ChartNoAxesColumn },
]

const secondaryItems: NavigationItem[] = [
  { label: '每周复盘', to: '/weekly', icon: CalendarCheck },
  { label: '个人设置', to: '/settings', icon: Settings2 },
]

function isItemActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

function NavigationLink({ item }: { item: NavigationItem }) {
  const Icon = item.icon

  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          isActive && 'bg-primary/8 text-primary hover:bg-primary/10 hover:text-primary',
        )
      }
      end={item.to === '/'}
      to={item.to}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
      <span>{item.label}</span>
    </NavLink>
  )
}

function MobileNavigation() {
  return (
    <nav
      aria-label="手机主导航"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] shadow-[0_-4px_18px_rgba(15,23,42,0.04)] backdrop-blur-md md:hidden"
    >
      {primaryItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            className={({ isActive }) =>
              cn(
                'flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive && 'text-primary',
              )
            }
            end={item.to === '/'}
            key={item.to}
            to={item.to}
          >
            <Icon aria-hidden="true" className="size-[18px]" strokeWidth={1.8} />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function Brand() {
  return (
    <Link aria-label="StudyOS 工作台" className="flex items-center gap-2.5 px-3 py-2" to="/">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <BookOpenCheck aria-hidden="true" className="size-[18px]" strokeWidth={2} />
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em] text-foreground">StudyOS</span>
    </Link>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const currentItem = [...primaryItems, ...secondaryItems].find((item) => isItemActive(pathname, item.to))
  const pageTitle = currentItem?.label ?? 'StudyOS'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r bg-sidebar px-3 py-5 md:flex">
        <Brand />
        <div className="mt-8 px-3 text-xs font-medium text-muted-foreground">工作区</div>
        <nav aria-label="桌面主导航" className="mt-2 space-y-1">
          {primaryItems.map((item) => <NavigationLink item={item} key={item.to} />)}
        </nav>
        <div className="mt-8 px-3 text-xs font-medium text-muted-foreground">整理</div>
        <nav aria-label="复盘与设置" className="mt-2 space-y-1">
          {secondaryItems.map((item) => <NavigationLink item={item} key={item.to} />)}
        </nav>
        <div className="mt-auto rounded-xl border bg-background/70 p-3">
          <p className="text-xs font-medium text-foreground">给学习留一段完整时间</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">记录一条活动，日后就能看见自己的积累。</p>
        </div>
      </aside>

      <div className="md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground md:hidden">
              <BookOpenCheck aria-hidden="true" className="size-[18px]" />
            </span>
            <span className="text-sm font-semibold tracking-[-0.01em] md:hidden">StudyOS</span>
            <span className="hidden text-sm font-medium text-foreground md:block">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              aria-label="记录学习"
              className={cn(buttonVariants({ size: 'sm' }), 'h-9 gap-2 px-3')}
              to="/logs?new=1"
            >
              <Plus aria-hidden="true" className="size-4" />
              <span>记录学习</span>
            </Link>
            <Link
              aria-label="个人设置"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              to="/settings"
            >
              <Settings2 aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </header>

        <main className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1440px] px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 md:px-8 md:pb-10 lg:px-10">
          {children}
        </main>
      </div>

      <MobileNavigation />
    </div>
  )
}
