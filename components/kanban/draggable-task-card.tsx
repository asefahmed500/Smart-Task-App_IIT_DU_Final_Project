'use client'

import { useDraggable } from '@dnd-kit/core'
import TaskCard from './task-card'
import { Task } from '@/lib/slices/boardsApi'

import { useGetSessionQuery } from '@/lib/use-session'

interface DraggableTaskCardProps {
  task: Task
  focusMode?: boolean
  filterAssignee?: string | null
  isDragging?: boolean
  onClick?: () => void
  effectiveRole?: string | null
}

export default function DraggableTaskCard({
  task,
  focusMode,
  filterAssignee,
  isDragging: externalIsDragging,
  onClick,
  effectiveRole,
}: DraggableTaskCardProps) {
  const { data: session } = useGetSessionQuery()
  // Use board-level role if provided, otherwise fallback to platform role
  const isAdmin = effectiveRole === 'ADMIN' || session?.role === 'ADMIN'

  const { attributes, listeners, setNodeRef, transform, isDragging: internalIsDragging } = useDraggable({
    id: task.id,
    data: task,
  })

  const isDragging = externalIsDragging ?? internalIsDragging

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
    >
      <TaskCard
        id={task.id}
        title={task.title}
        description={task.description}
        priority={task.priority}
        labels={task.labels}
        dueDate={task.dueDate}
        createdAt={task.createdAt}
        assignee={task.assignee}
        position={task.position}
        isBlocked={task.isBlocked}
        lastMovedAt={task.lastMovedAt}
        focusMode={focusMode}
        filterAssignee={filterAssignee}
        isDragging={isDragging}
        role={effectiveRole || session?.role}
        onClick={onClick}
      />
    </div>
  )
}
