'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, MoreVertical, Paperclip, MessageSquare, CheckSquare } from 'lucide-react'
import { cn } from '@/utils/utils'
import { Task, ChecklistItem, Checklist } from '@/types/kanban'

interface TaskCardProps {
  task: Task
  isOverlay?: boolean
  onClick?: () => void
}

export function TaskCard({ task, isOverlay, onClick }: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: 'Task',
      task,
    },
  })

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-primary/10 border-2 border-dashed border-primary/20 h-[120px] min-h-[120px] items-center flex justify-center rounded-xl"
      />
    )
  }

  const priorityColor = {
    LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    URGENT: 'bg-red-500/10 text-red-500 border-red-500/20',
  }[task.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'] || 'bg-muted text-muted-foreground'

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "group relative bg-background/50 backdrop-blur-sm border-primary/5 hover:border-primary/20 transition-all cursor-grab active:cursor-grabbing rounded-xl overflow-hidden",
        isOverlay && "ring-2 ring-primary shadow-2xl scale-105"
      )}
    >
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider font-bold h-5 px-2", priorityColor)}>
            {task.priority}
          </Badge>
          <button className="text-muted-foreground/50 hover:text-primary transition-colors">
            <MoreVertical className="size-4" />
          </button>
        </div>

        <h3 className="font-semibold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
          {task.title}
        </h3>

        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag: { id: string; name: string; color: string }) => (
              <span
                key={tag.id}
                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: tag.color + '20', color: tag.color, border: `1px solid ${tag.color}30` }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-primary/5">
          <div className="flex items-center gap-3">
            {task.assignee ? (
              <Avatar className="size-6 border border-primary/10">
                <AvatarImage src={task.assignee.image ?? undefined} />
                <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                  {task.assignee.name?.[0] || task.assignee.email[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="text-[10px] px-2 py-0.5 rounded-full border border-dashed border-primary/20 bg-muted/30 text-muted-foreground">
                Unassigned
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
               {(task._count?.comments ?? 0) > 0 && (
                <div className="flex items-center gap-1" title="Comments">
                  <MessageSquare className="size-3" />
                  <span>{task._count?.comments}</span>
                </div>
              )}
              {(task._count?.attachments ?? 0) > 0 && (
                <div className="flex items-center gap-1" title="Attachments">
                  <Paperclip className="size-3" />
                  <span>{task._count?.attachments}</span>
                </div>
              )}
               {(task.checklists?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1" title="Checklist progress">
                  <CheckSquare className="size-3" />
                  <span>
                    {task.checklists?.reduce((acc: number, cl: Checklist) => acc + (cl.items?.filter((i: ChecklistItem) => i.isCompleted).length || 0), 0)}
                    /
                    {task.checklists?.reduce((acc: number, cl: Checklist) => acc + (cl.items?.length || 0), 0)}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
            <Calendar className="size-3" />
            <span>{new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
