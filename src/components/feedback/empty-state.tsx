import type { ReactNode } from 'react'
import { CircleDot } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex min-h-56 flex-col items-center justify-center px-6 py-10 text-center', className)}>
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-muted/50 text-muted-foreground">
        {icon ?? <CircleDot aria-hidden="true" className="size-5" />}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button className="mt-5" onClick={onAction} size="sm">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
