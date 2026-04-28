'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Priority } from '@/lib/slices/boardsApi'
import { GripVertical, AlertCircle, Edit2, Clock, MoreVertical, Trash2, User, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect } from 'react'
import DueTimeline from './due-timeline'
import PresenceStack from './presence-stack'
import { useAppSelector } from '@/lib/hooks'
import { motion, AnimatePresence } from 'framer-motion'
import type { EditingUser } from '@/lib/slices/presenceSlice'

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
  totalTimeSpent?: number
  role?: string // Alternative to session query inside for performance if passed down
  onClick?: () => void
}

const priorityColors: Record<Priority, string> = {
  LOW: 'bg-primary/10 text-primary border-primary/20',
  MEDIUM: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
  HIGH: 'bg-accent/10 text-accent-foreground border-accent/20',
  CRITICAL: 'bg-destructive/10 text-destructive border-destructive/20',
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
  totalTimeSpent,
  role,
  onClick,
}: TaskCardProps) {

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

  const formatTotalTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="w-full"
    >
      <Card
        onClick={onClick}
        className={cn(
          'group transition-all duration-300 cursor-pointer relative',
          'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-white/20 dark:border-zinc-800/20',
          'shadow-[0_2px_4px_rgba(0,0,0,0.02),0_1px_1px_rgba(0,0,0,0.01)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.01)]',
          'rounded-[16px] overflow-hidden',
          isDragging && 'opacity-50 rotate-1 shadow-2xl ring-2 ring-primary/30 scale-[1.02] z-50',
          isStale && 'border-amber-200/30 bg-amber-50/10 dark:border-amber-900/20 dark:bg-amber-950/10',
          isBlocked && 'border-destructive/30 bg-destructive/10 dark:border-destructive/20 dark:bg-destructive/10',
          editingUsers.length > 0 && 'ring-2 ring-primary/30'
        )}
      >
        {/* Glow effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute -inset-[100%] bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.03),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_70%)]" />
        </div>
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
              className="flex items-center gap-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full shadow-sm"
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
          <div className="flex items-center gap-1">
            <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick && onClick(); }}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                  <User className="mr-2 h-4 w-4" />
                  Assign
                </DropdownMenuItem>
                {(role === 'ADMIN' || role === 'MANAGER') && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Task
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
          {/* Assignee & Time */}
          <div className="flex items-center gap-3">
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

            {totalTimeSpent != null && totalTimeSpent > 0 && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full font-medium">
                <Clock className="h-2.5 w-2.5" />
                <span>{formatTotalTime(totalTimeSpent)}</span>
              </div>
            )}
          </div>

          {/* Due Timeline */}
          {dueDate && <DueTimeline dueDate={dueDate} currentTime={currentTime} createdAt={createdAt} />}
        </div>

        {/* Presence Stack */}
        <PresenceStack taskId={id} />
      </CardContent>
      </Card>
    </motion.div>
  )
}
