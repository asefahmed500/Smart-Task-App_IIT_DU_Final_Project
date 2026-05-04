'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { History, Filter, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface TaskActivityTabProps {
  activityLog: any[]
  filteredActivityLog: any[]
  activityFilter: string
  setActivityFilter: (val: string) => void
  isLoading: boolean
}

export function TaskActivityTab({
  activityLog,
  filteredActivityLog,
  activityFilter,
  setActivityFilter,
  isLoading
}: TaskActivityTabProps) {
  const getActionColor = (action: string) => {
    if (action.includes('CREATED')) return 'text-green-500'
    if (action.includes('DELETED')) return 'text-red-500'
    if (action.includes('MOVED')) return 'text-blue-500'
    if (action.includes('UPDATED')) return 'text-orange-500'
    return 'text-primary'
  }

  const formatAction = (action: string) => {
    return action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')
  }

  const formatDetails = (action: string, details: Record<string, unknown>): string => {
    if (!details || typeof details !== 'object') return ''
    const d = details as Record<string, unknown>

    if (action.includes('MOVED') && d.newStatus && d.previousColumnId) {
      return `Moved to ${d.newStatus}`
    }
    if (action.includes('CREATED')) {
      return d.title ? `Created task: ${d.title}` : 'Task created'
    }
    if (action.includes('UPDATED') && d.field) {
      return `Updated ${d.field}${d.newValue !== undefined ? ` to ${d.newValue}` : ''}`
    }
    if (action.includes('DELETED')) {
      return d.title ? `Deleted task: ${d.title}` : 'Task deleted'
    }
    if (action.includes('COMMENT')) {
      return typeof d.content === 'string' ? d.content : 'Comment added'
    }
    if (action.includes('ATTACHMENT')) {
      return d.name ? `Attached: ${d.name}` : 'Attachment added'
    }
    if (action.includes('UNDO')) {
      return 'Action undone'
    }
    const parts = Object.entries(d)
      .filter(([k]) => !['taskId', 'boardId', 'columnId', 'override'].includes(k))
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    return parts.join(' • ')
  }

  return (
    <div className="space-y-6 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <History className="size-4 text-primary" />
          Audit Trail
        </div>
        <div className="flex items-center gap-2">
          <Filter className="size-3 text-muted-foreground" />
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="h-8 w-[140px] text-[10px] bg-muted/20 border-primary/5">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Actions</SelectItem>
              <SelectItem value="TASK_CREATED" className="text-xs">Created</SelectItem>
              <SelectItem value="TASK_UPDATED" className="text-xs">Updated</SelectItem>
              <SelectItem value="TASK_MOVED" className="text-xs">Moved</SelectItem>
              <SelectItem value="COMMENT_ADDED" className="text-xs">Comments</SelectItem>
              <SelectItem value="ATTACHMENT_ADDED" className="text-xs">Attachments</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="relative space-y-6 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-[1px] before:bg-gradient-to-b before:from-primary/20 before:via-primary/10 before:to-transparent">
        {filteredActivityLog.map((log) => (
          <div key={log.id} className="relative pl-10 group">
            <div className="absolute left-[13px] top-1.5 size-2 rounded-full bg-background border-2 border-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] group-hover:scale-125 transition-transform z-10" />
            
            <div className="bg-muted/10 p-4 rounded-xl border border-primary/5 hover:border-primary/10 transition-all hover:bg-muted/20">
              <div className="flex items-start gap-3">
                <Avatar className="size-8 border border-primary/5 shadow-sm">
                  <AvatarImage src={log.user?.image || undefined} />
                  <AvatarFallback className="bg-primary/5 text-primary text-[10px]">
                    {log.user?.name?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">
                      {log.user?.name}
                      <span className={`ml-2 font-normal ${getActionColor(log.action)}`}>
                        {formatAction(log.action)}
                      </span>
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="size-3" />
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                  {log.details && (
                    <p className="text-xs text-muted-foreground bg-background/40 p-2 rounded border border-primary/5 mt-2">
                      {typeof log.details === 'string'
                        ? log.details
                        : formatDetails(log.action, log.details)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredActivityLog.length === 0 && !isLoading && (
          <div className="text-center py-12 text-muted-foreground bg-muted/5 rounded-2xl border-2 border-dashed border-primary/5">
            <History className="size-10 mx-auto mb-4 opacity-10" />
            <p className="text-sm">No activity found for this filter</p>
          </div>
        )}
      </div>
    </div>
  )
}
