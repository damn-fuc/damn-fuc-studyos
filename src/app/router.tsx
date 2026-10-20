import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/layouts/app-layout'
import { RequireAuth } from '@/features/auth/require-auth'
import { LoginPage } from '@/pages/login-page'
import { ResetPasswordPage } from '@/pages/reset-password-page'
import { LoadingState } from '@/components/feedback/loading-state'

const DashboardPage = lazy(() => import('@/pages/dashboard-page').then((module) => ({ default: module.DashboardPage })))
const TasksPage = lazy(() => import('@/pages/tasks-page').then((module) => ({ default: module.TasksPage })))
const LogsPage = lazy(() => import('@/pages/logs-page').then((module) => ({ default: module.LogsPage })))
const ProjectsPage = lazy(() => import('@/pages/projects-page').then((module) => ({ default: module.ProjectsPage })))
const AnalyticsPage = lazy(() => import('@/pages/analytics-page').then((module) => ({ default: module.AnalyticsPage })))
const WeeklyReviewPage = lazy(() => import('@/pages/weekly-review-page').then((module) => ({ default: module.WeeklyReviewPage })))
const SettingsPage = lazy(() => import('@/pages/settings-page').then((module) => ({ default: module.SettingsPage })))

function PrivatePage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState label="正在加载工作区" rows={3} />}>{children}</Suspense>
}

export function AppRouter() {
  return (
    <Routes>
      <Route element={<LoginPage />} path="/login" />
      <Route element={<ResetPasswordPage />} path="/reset-password" />
      <Route element={<RequireAuth><AppLayout><Outlet /></AppLayout></RequireAuth>}>
        <Route element={<PrivatePage><DashboardPage /></PrivatePage>} path="/" />
        <Route element={<PrivatePage><TasksPage /></PrivatePage>} path="/tasks/*" />
        <Route element={<PrivatePage><LogsPage /></PrivatePage>} path="/logs/*" />
        <Route element={<PrivatePage><ProjectsPage /></PrivatePage>} path="/projects/*" />
        <Route element={<PrivatePage><AnalyticsPage /></PrivatePage>} path="/analytics" />
        <Route element={<PrivatePage><WeeklyReviewPage /></PrivatePage>} path="/weekly/*" />
        <Route element={<PrivatePage><SettingsPage /></PrivatePage>} path="/settings" />
      </Route>
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  )
}
