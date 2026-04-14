'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DueTimelineProps {
  dueDate: string
  currentTime: Date
}

export default function DueTimeline({ dueDate, currentTime }: DueTimelineProps) {
  const due = new Date(dueDate)
  const diff = due.getTime() - currentTime.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  let text = ''
  let colorClass = ''

  if (diff < 0) {
    const overdueDays = Math.abs(days)
    text = overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`
    colorClass = 'text-red-500 bg-red-500/10 border-red-500/20'
  } else if (hours < 24) {
    text = `${hours} hours left`
    colorClass = 'text-orange-500 bg-orange-500/10 border-orange-500/20'
  } else if (days < 2) {
    text = 'Due today'
    colorClass = 'text-orange-500 bg-orange-500/10 border-orange-500/20'
  } else if (days < 3) {
    text = 'Due tomorrow'
    colorClass = 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  } else if (days <= 7) {
    text = `Due in ${days} days`
    colorClass = 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
  } else {
    text = `Due in ${days} days`
    colorClass = 'text-green-500 bg-green-500/10 border-green-500/20'
  }

  return (
    <Badge variant="outline" className={cn('text-xs', colorClass)}>
      {text}
    </Badge>
  )
}
