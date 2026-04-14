'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Priority } from '@/lib/slices/boardsApi'
import { GripVertical, AlertCircle, Edit2, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'
import DueTimeline from './due-timeline'
import PresenceStack from './presence-stack'
import { useAppSelector } from '@/lib/hooks'
import type { EditingUser } from '@/lib/slices/presenceSlice'

import { useGetSessionQuery } from '@/lib/slices/authApi'

interface TaskCardProps {
  id: string
  title: string
  description: string | null
  priority: Priority
  labels: string[]
  dueDate: string | null
  createdAt: string
  assignee?: {
    id: string
    name: string | null
    avatar: string | null
  } | null
  position: number
  isBlocked: boolean
  lastMovedAt: string
  focusMode?: boolean
  filterAssignee?: string | null
  isDragging?: boolean
  role?: string // Alternative to session query inside for performance if passed down
  onClick?: () => void
}

const priorityColors: Record<Priority, string> = {
  LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export default function TaskCard({
  id,
  title,
  description,
  priority,
  labels,
  dueDate,
  createdAt,
  assignee,
  isBlocked,
  lastMovedAt,
  focusMode,
  filterAssignee,
  isDragging,
  onClick,
}: TaskCardProps) {
  const { data: session } = useGetSessionQuery()
  const isAdmin = session?.role === 'ADMIN'

  const [currentTime, setCurrentTime] = useState(new Date())
  const editingUsers = useAppSelector((state) =>
    state.presence.usersEditing.filter((u: EditingUser) => u.taskId === id)
  )

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  // Check if task is stale (>5 days since last moved)
  const isStale = formatDistanceToNow(new Date(lastMovedAt), { addSuffix: true }).includes('days')

  // Filter by focus mode and assignee
  const isHidden = focusMode && (!assignee || filterAssignee && assignee.id !== filterAssignee)

  if (isHidden) {
    return (
      <Card
        className={cn(
          'opacity-10 blur-sm select-none transition-all',
          isDragging && 'opacity-50 rotate-2'
        )}
      >
        <CardContent className="p-3">
          <p className="font-medium">{title}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        'group hover:shadow-md transition-all cursor-pointer relative bg-white border-2 border-[rgba(0,0,0,0.06)] rounded-[14px] shadow-sm',
        isDragging && 'opacity-50 rotate-1 shadow-xl ring-2 ring-primary/30 scale-[1.02]',
        isStale && 'border-amber-200/50 bg-amber-50/20',
        isBlocked && 'border-red-200/50 bg-red-50/20',
        editingUsers.length > 0 && 'ring-2 ring-blue-500/50'
      )}
    >
      {/* Visual Aging Indicator - subtly show cards that haven't moved */}
      {isStale && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-amber-600/60 font-medium bg-amber-100/30 px-1.5 py-0.5 rounded-full">
           <Clock className="h-2.5 w-2.5" />
           STALE
        </div>
      )}

      {/* Live Cursor Badge - Shows who is currently editing */}
      {editingUsers.length > 0 && (
        <div className="absolute -top-1 -right-1 z-10 flex -space-x-1">
          {editingUsers.slice(0, 3).map((user: EditingUser) => (
            <div
              key={user.userId}
              className="flex items-center gap-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-sm"
              title={`${user.userName} is editing`}
            >
              <Edit2 className="h-2.5 w-2.5" />
              <span className="font-medium">{user.userName?.[0] || '?'}</span>
            </div>
          ))}
        </div>
      )}

      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Badge variant="outline" className={cn('text-xs', priorityColors[priority])}>
            {priority}
          </Badge>
          {!isAdmin && (
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>

        {/* Title */}
        <h3 className="font-medium text-sm mb-1 line-clamp-2">{title}</h3>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {description}
          </p>
        )}

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {labels.slice(0, 3).map((label) => (
              <Badge key={label} variant="secondary" className="text-xs px-1.5 py-0">
                {label}
              </Badge>
            ))}
            {labels.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                +{labels.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Blocked Indicator */}
        {isBlocked && (
          <div className="flex items-center gap-1 text-amber-500 text-xs mb-2">
            <AlertCircle className="h-3 w-3" />
            <span>Blocked</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t">
          {/* Assignee */}
          {assignee ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignee.avatar || undefined} alt={assignee.name || 'User'} />
              <AvatarFallback className="text-xs">{assignee.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <span className="text-xs text-muted-foreground">?</span>
            </div>
          )}

          {/* Due Timeline */}
          {dueDate && <DueTimeline dueDate={dueDate} currentTime={currentTime} createdAt={createdAt} />}
        </div>

        {/* Presence Stack */}
        <PresenceStack taskId={id} />
      </CardContent>
    </Card>
  )
}
