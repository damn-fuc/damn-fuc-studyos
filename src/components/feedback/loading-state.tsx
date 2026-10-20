import { Skeleton } from '@/components/ui/skeleton'

type LoadingStateProps = {
  label?: string
  rows?: number
}

export function LoadingState({ label = '正在加载', rows = 3 }: LoadingStateProps) {
  return (
    <div aria-busy="true" aria-label={label} className="space-y-3" role="status">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton className="h-14 w-full rounded-xl" key={index} />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  )
}
