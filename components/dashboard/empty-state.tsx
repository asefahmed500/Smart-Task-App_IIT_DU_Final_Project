import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  icon?: ReactNode
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <Card className="p-12 text-center rounded-[20px]">
      {icon && (
        <div className="flex justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-body-standard text-[#777169] mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction}>
          <Plus className="h-4 w-4 mr-2" />
          {actionLabel}
        </Button>
      )}
    </Card>
  )
}

interface LoadingSkeletonProps {
  count?: number
  type?: 'stat' | 'card' | 'row'
}

export function LoadingSkeleton({ count = 3, type = 'card' }: LoadingSkeletonProps) {
  if (type === 'stat') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={`stat-${i}`} className="h-24 bg-[#f5f5f5] rounded-[20px] animate-pulse" />
        ))}
      </div>
    )
  }

  if (type === 'row') {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={`row-${i}`} className="h-16 bg-[#f5f5f5] rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={`card-${i}`} className="h-40 bg-[#f5f5f5] rounded-[20px] animate-pulse" />
      ))}
    </div>
  )
}
