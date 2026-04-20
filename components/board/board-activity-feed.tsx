'use client'

import { useEffect } from 'react'
import { useGetBoardAuditQuery } from '@/lib/slices/boardsApi'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { formatDistanceToNow } from 'date-fns'
import { Activity, Layout, UserPlus, UserMinus, Shield, Link2, MessageSquare, Settings } from 'lucide-react'
import { onBoardUpdate, onMemberUpdate, onAutomationUpdate, onTaskUpdate, onTaskDelete } from '@/lib/socket'

interface BoardActivityFeedProps {
  boardId: string
}

export default function BoardActivityFeed({ boardId }: BoardActivityFeedProps) {
  const { data: logs, isLoading, refetch } = useGetBoardAuditQuery(boardId)

  useEffect(() => {
    // Refetch audit logs when board events occur
    const unsubscribeBoard = onBoardUpdate(() => refetch())
    const unsubscribeMembers = onMemberUpdate(() => refetch())
    const unsubscribeAutomations = onAutomationUpdate(() => refetch())
    const unsubscribeTaskUpdate = onTaskUpdate(() => refetch())
    const unsubscribeTaskDelete = onTaskDelete(() => refetch())

    return () => {
      unsubscribeBoard()
      unsubscribeMembers()
      unsubscribeAutomations()
      unsubscribeTaskUpdate()
      unsubscribeTaskDelete()
    }
  }, [boardId, refetch])

  if (isLoading) return <div className="p-4 text-center text-muted-foreground">Loading activity...</div>

  if (!logs || logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
        <Activity className="h-12 w-12 mb-4" />
        <p>No activity recorded yet for this board.</p>
      </div>
    )
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'MEMBER_ADDED': return <UserPlus className="h-3 w-3 text-blue-500" />
      case 'MEMBER_REMOVED': return <UserMinus className="h-3 w-3 text-red-500" />
      case 'MEMBER_ROLE_CHANGED': return <Shield className="h-3 w-3 text-amber-500" />
      case 'TASK_CREATED': return <Layout className="h-3 w-3 text-green-500" />
      case 'TASK_MOVED': return <Activity className="h-3 w-3 text-purple-500" />
      case 'COMMENT_ADDED': return <MessageSquare className="h-3 w-3 text-sky-500" />
      case 'DEPENDENCY_ADDED': return <Link2 className="h-3 w-3 text-indigo-500" />
      case 'BOARD_UPDATED': return <Settings className="h-3 w-3 text-slate-500" />
      default: return <Activity className="h-3 w-3 text-slate-500" />
    }
  }

  return (
    <ScrollArea className="min-h-[300px] max-h-[600px] pr-4">
      <div className="space-y-6">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-4 items-start">
            <div className="relative">
              <Avatar className="h-8 w-8 border shadow-sm">
                <AvatarImage src={log.actor?.avatar || undefined} />
                <AvatarFallback>{log.actor?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border shadow-sm">
                 {getActionIcon(log.action)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
               <p className="text-sm leading-snug">
                 <span className="font-semibold text-foreground">{log.actor?.name}</span>{' '}
                 <span className="text-muted-foreground">
                   {formatAction(log)}
                 </span>
               </p>
               <p className="text-[11px] text-muted-foreground mt-1 uppercase tracking-tight">
                 {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
               </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}

function formatAction(log: any): string {
  const { action, changes, task, target } = log
  
  switch (action) {
    case 'BOARD_CREATED': return 'created this board'
    case 'BOARD_UPDATED': return 'updated board settings'
    case 'MEMBER_ADDED': return `invited ${target?.name || 'new member'} to the team`
    case 'MEMBER_REMOVED': return `removed ${target?.name || 'a member'} from the team`
    case 'MEMBER_ROLE_CHANGED': return `changed ${target?.name || 'member'}'s role to ${changes?.newRole || changes?.role}`
    case 'TASK_CREATED': return `created task "${task?.title || 'New Task'}"`
    case 'TASK_MOVED': return `moved "${task?.title || 'a task'}" to ${changes?.to_column_name || 'new column'}`
    case 'TASK_UPDATED': return `updated task "${task?.title || 'a task'}"`
    case 'COMMENT_ADDED': return `commented on "${task?.title || 'a task'}"`
    case 'DEPENDENCY_ADDED': return `linked a dependency to "${task?.title || 'a task'}"`
    default: return action.replace(/_/g, ' ').toLowerCase()
  }
}
