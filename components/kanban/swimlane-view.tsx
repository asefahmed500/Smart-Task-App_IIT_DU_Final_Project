'use client'

import { useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Task, Column as ColumnType } from '@/lib/slices/boardsApi'
import { cn } from '@/lib/utils'

interface SwimlaneViewProps {
  tasks: Task[]
  columns: ColumnType[]
  groupBy: 'assignee' | 'priority' | 'label'
  renderTaskCard: (task: Task) => React.ReactNode
}

const priorityColors = {
  LOW: 'bg-muted/10 text-muted-foreground border-muted/20',
  MEDIUM: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
  HIGH: 'bg-accent/10 text-accent-foreground border-accent/20',
  CRITICAL: 'bg-destructive/10 text-destructive border-destructive/20',
}

export default function SwimlaneView({ tasks = [], columns, groupBy, renderTaskCard }: SwimlaneViewProps) {
  const groupedData = useMemo(() => {
    const groups = new Map<string, Task[]>()

    tasks.forEach((task) => {
      let key = 'Unassigned'
      if (groupBy === 'assignee') {
        key = task.assignee ? task.assignee.name || task.assignee.id : 'Unassigned'
      } else if (groupBy === 'priority') {
        key = task.priority
      } else if (groupBy === 'label') {
        key = task.labels?.[0] || 'No Label'
      }

      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(task)
    })

    return Array.from(groups.entries()).map(([key, tasks]) => ({ key, tasks }))
  }, [tasks, groupBy])

  const getGroupIcon = (key: string) => {
    if (groupBy === 'assignee') {
      return (
        <Avatar className="h-6 w-6">
          <AvatarFallback className="text-xs">{key[0]}</AvatarFallback>
        </Avatar>
      )
    }
    if (groupBy === 'priority') {
      return <Badge variant="outline" className={cn('text-xs', priorityColors[key as keyof typeof priorityColors])}>{key}</Badge>
    }
    return <Badge variant="secondary" className="text-xs">{key}</Badge>
  }

  return (
    <div className="flex-1 overflow-x-auto">
      <div className="min-w-max flex flex-col gap-6 pb-6 pr-6">
        {/* Unified Column Headers */}
        <div className="flex gap-4 h-8 items-center px-4">
          <div className="w-48 flex-shrink-0" /> {/* Spacer for the lane title column */}
          {columns.map((column) => (
            <div key={column.id} className="w-80 flex-shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2">
              {column.name}
            </div>
          ))}
        </div>

        {/* Lanes */}
        <div className="space-y-6">
          {groupedData.map(({ key, tasks }) => (
            <div key={key} className="flex gap-4 group">
              {/* Lane Info Column - Sticky Left */}
              <div className="w-48 flex-shrink-0 sticky left-0 z-10 bg-[rgba(255,255,255,0.8)] backdrop-blur-md p-4 rounded-xl border border-[rgba(0,0,0,0.08)] shadow-sm self-start">
                <div className="flex items-center gap-2 mb-2">
                  {getGroupIcon(key)}
                  <h3 className="text-sm font-semibold truncate">{key}</h3>
                </div>
                <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0 h-4 min-w-[32px] justify-center">
                  {tasks.length}
                </Badge>
              </div>

              {/* Lane Columns */}
              {columns.map((column) => {
                const columnTasks = tasks.filter((t) => t.columnId === column.id)
                return (
                  <div 
                    key={column.id} 
                    className={cn(
                      "w-80 flex-shrink-0 space-y-3 p-3 rounded-xl transition-colors min-h-[120px]",
                      "bg-[rgba(0,0,0,0.02)] border border-dashed border-transparent group-hover:border-[rgba(0,0,0,0.06)]"
                    )}
                  >
                    {columnTasks.map((task) => (
                      <div key={task.id}>{renderTaskCard(task)}</div>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[10px] text-muted-foreground/50 font-medium">EMPTY</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
