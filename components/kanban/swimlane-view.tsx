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
  LOW: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export default function SwimlaneView({ tasks, columns, groupBy, renderTaskCard }: SwimlaneViewProps) {
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
    <div className="space-y-4">
      {groupedData.map(({ key, tasks }) => (
        <Card key={key} className="p-4">
          {/* Swimlane Header */}
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[rgba(0,0,0,0.08)]">
            {getGroupIcon(key)}
            <h3 className="text-body font-medium">{key}</h3>
            <span className="text-caption text-[#777169]">({tasks.length} tasks)</span>
          </div>

          {/* Columns within swimlane */}
          <div className="flex gap-4 overflow-x-auto pb-2">
            {columns.map((column) => {
              const columnTasks = tasks.filter((t) => t.columnId === column.id)
              return (
                <div key={column.id} className="flex-shrink-0 w-72">
                  <div className="text-body-medium mb-2 px-2">{column.name}</div>
                  <div className="space-y-2 min-h-[100px] bg-[#f5f5f5] rounded-lg p-2">
                    {columnTasks.map((task) => (
                      <div key={task.id}>{renderTaskCard(task)}</div>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="text-center text-caption text-[#777169] py-4">No tasks</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      ))}
    </div>
  )
}
