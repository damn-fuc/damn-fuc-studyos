import { Component, type ErrorInfo, type ReactNode } from 'react'

import { ErrorState } from '@/components/feedback/error-state'

type ErrorBoundaryProps = {
  children: ReactNode
}

type ErrorBoundaryState = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Deliberately keep private study content out of browser logs and telemetry.
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="mx-auto flex min-h-screen max-w-xl items-center px-4">
          <ErrorState
            description="页面遇到问题。重新加载后可以继续使用。"
            onRetry={() => window.location.reload()}
            retryLabel="重新加载"
            title="页面暂时无法显示"
          />
        </main>
      )
    }

    return this.props.children
  }
}
