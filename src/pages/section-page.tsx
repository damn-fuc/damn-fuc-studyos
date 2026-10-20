import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { EmptyState } from '@/components/feedback/empty-state'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent } from '@/components/ui/card'

type SectionPageProps = {
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  icon: LucideIcon
}

export function SectionPage({
  title,
  description,
  emptyTitle,
  emptyDescription,
  icon,
}: SectionPageProps) {
  const navigate = useNavigate()
  const Icon = icon

  return (
    <div>
      <PageHeader description={description} title={title} />
      <Card>
        <CardContent className="p-2 sm:p-4">
          <EmptyState
            description={emptyDescription}
            actionLabel="返回工作台"
            icon={<Icon aria-hidden="true" className="size-5" />}
            onAction={() => navigate('/')}
            title={emptyTitle}
          />
        </CardContent>
      </Card>
    </div>
  )
}
