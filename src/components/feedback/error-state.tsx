import { AlertCircle, RefreshCw } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

type ErrorStateProps = {
  title?: string
  description: string
  onRetry?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = '暂时无法加载',
  description,
  onRetry,
  retryLabel = '重试',
}: ErrorStateProps) {
  return (
    <Alert className="border-destructive/30 bg-destructive/5" variant="destructive">
      <AlertCircle aria-hidden="true" className="size-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
        <span>{description}</span>
        {onRetry ? (
          <Button onClick={onRetry} size="sm" variant="outline">
            <RefreshCw aria-hidden="true" className="size-3.5" />
            {retryLabel}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}
