'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface DueTimelineProps {
  dueDate: string
  currentTime: Date
}

export default function DueTimeline({ dueDate, currentTime, createdAt }: DueTimelineProps & { createdAt?: string }) {
  const due = new Date(dueDate)
  const now = currentTime
  const diff = due.getTime() - now.getTime()
  
  // Robust day calculation (ignoring time)
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime()
  const dayDiff = Math.round((startOfDue - startOfNow) / (1000 * 60 * 60 * 24))

  let text = ''
  let colorClass = ''
  let progress = 0

  // Calculate progress if createdAt is provided
  if (createdAt) {
    const created = new Date(createdAt).getTime()
    const total = due.getTime() - created
    const elapsed = now.getTime() - created
    progress = Math.min(100, Math.max(0, (elapsed / total) * 100))
  }

  if (diff < 0) {
    const overdueDays = Math.abs(dayDiff)
    text = overdueDays === 0 ? 'Overdue - was due today' : overdueDays === 1 ? 'Overdue - was due yesterday' : `Overdue by ${overdueDays} days`
    colorClass = 'text-red-500 bg-red-500/10 border-red-500/20'
    progress = 100
  } else if (dayDiff === 0) {
    const hoursRemaining = Math.max(0, Math.floor(diff / (1000 * 60 * 60)))
    text = hoursRemaining === 0 ? 'Due now' : `Due today (${hoursRemaining}h left)`
    colorClass = 'text-orange-600 bg-orange-500/10 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]'
  } else if (dayDiff === 1) {
    text = 'Due tomorrow'
    colorClass = 'text-amber-600 bg-amber-500/10 border-amber-500/20'
  } else if (dayDiff <= 7) {
    text = `Due in ${dayDiff} days`
    colorClass = 'text-yellow-600 bg-yellow-500/10 border-yellow-500/20'
  } else {
    text = `Due in ${dayDiff} days`
    colorClass = 'text-green-600 bg-green-500/10 border-green-500/20'
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between gap-1">
        <Badge variant="outline" className={cn('text-[9px] py-0 px-1.5 h-4 font-bold uppercase tracking-tight whitespace-nowrap', colorClass)}>
          {text}
        </Badge>
        {createdAt && dayDiff >= 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">{Math.round(progress)}%</span>
        )}
      </div>
      {createdAt && (
        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-[rgba(0,0,0,0.03)]">
          <div 
            className={cn(
              "h-full transition-all duration-1000 rounded-full",
              dayDiff < 0 ? "bg-red-500" : dayDiff === 0 ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" : dayDiff <= 7 ? "bg-yellow-500" : "bg-green-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}
