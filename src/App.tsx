import { HashRouter } from 'react-router-dom'

import { AppErrorBoundary } from '@/app/error-boundary'
import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { Toaster } from '@/components/ui/sonner'
import { AuthNavigationBridge } from '@/features/auth/auth-navigation-bridge'

function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <HashRouter>
          <AuthNavigationBridge />
          <AppRouter />
        </HashRouter>
        <Toaster position="top-right" />
      </AppProviders>
    </AppErrorBoundary>
  )
}

export default App
