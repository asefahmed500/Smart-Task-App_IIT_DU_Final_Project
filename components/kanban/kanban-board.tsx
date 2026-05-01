'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  rectIntersection,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { ColumnContainer } from './column-container'
import { TaskCard } from './task-card'
import { updateTaskStatus } from '@/lib/task-actions'
import { reorderColumns } from '@/lib/board-actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, Zap } from 'lucide-react'
import { AddColumnDialog } from './add-column-dialog'
import { TaskDetailsDialog } from './task-details-dialog'

interface Task {
  id: string
  title: string
  description?: string | null
  priority: string
  columnId: string
  assignee?: any
  checklists: any[]
}

interface Column {
  id: string
  name: string
  order: number
  tasks: Task[]
}

interface Board {
  id: string
  name: string
  columns: Column[]
  members: any[]
}

interface KanbanBoardProps {
  board: Board
  currentUser: any
}

export function KanbanBoard({ board: initialBoard, currentUser }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board>(initialBoard)
  const [activeColumn, setActiveColumn] = useState<Column | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  const columnsId = useMemo(() => board.columns.map((col: any) => col.id), [board.columns])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const onDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === 'Column') {
      setActiveColumn(event.active.data.current.column)
      return
    }

    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task)
      return
    }
  }

  const onDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveATask = active.data.current?.type === 'Task'
    const isOverATask = over.data.current?.type === 'Task'

    if (!isActiveATask) return

    // Dropping a Task over another Task
    if (isActiveATask && isOverATask) {
      setBoard((prev: any) => {
        const activeIndex = prev.columns.flatMap((c: any) => c.tasks).findIndex((t: any) => t.id === activeId)
        const overIndex = prev.columns.flatMap((c: any) => c.tasks).findIndex((t: any) => t.id === overId)
        
        // Find columns
        const activeColumn = prev.columns.find((c: any) => c.tasks.some((t: any) => t.id === activeId))
        const overColumn = prev.columns.find((c: any) => c.tasks.some((t: any) => t.id === overId))

        if (activeColumn.id !== overColumn.id) {
          // Move between columns
          const newColumns = prev.columns.map((col: any) => {
            if (col.id === activeColumn.id) {
              return { ...col, tasks: col.tasks.filter((t: any) => t.id !== activeId) }
            }
            if (col.id === overColumn.id) {
              const activeTask = activeColumn.tasks.find((t: any) => t.id === activeId)
              const newTasks = [...col.tasks]
              const targetIndex = col.tasks.findIndex((t: any) => t.id === overId)
              newTasks.splice(targetIndex, 0, activeTask)
              return { ...col, tasks: newTasks }
            }
            return col
          })
          return { ...prev, columns: newColumns }
        }

        return prev
      })
    }

    // Dropping a Task over a Column
    const isOverAColumn = over.data.current?.type === 'Column'
    if (isActiveATask && isOverAColumn) {
      setBoard((prev: any) => {
        const activeColumn = prev.columns.find((c: any) => c.tasks.some((t: any) => t.id === activeId))
        const overColumnId = overId as string

        if (activeColumn.id !== overColumnId) {
          const newColumns = prev.columns.map((col: any) => {
            if (col.id === activeColumn.id) {
              return { ...col, tasks: col.tasks.filter((t: any) => t.id !== activeId) }
            }
            if (col.id === overColumnId) {
              const activeTask = activeColumn.tasks.find((t: any) => t.id === activeId)
              return { ...col, tasks: [...col.tasks, activeTask] }
            }
            return col
          })
          return { ...prev, columns: newColumns }
        }
        return prev
      })
    }
  }

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveColumn(null)
    setActiveTask(null)

    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    // Handle column reordering
    if (active.data.current?.type === 'Column' && over.data.current?.type === 'Column') {
      const activeIndex = board.columns.findIndex((c: any) => c.id === activeId)
      const overIndex = board.columns.findIndex((c: any) => c.id === overId)
      const newColumns = arrayMove(board.columns, activeIndex, overIndex)
      
      setBoard((prev: any) => ({ ...prev, columns: newColumns }))
      
      try {
        await reorderColumns(board.id, newColumns.map((c: Column) => c.id))
        toast.success('Columns reordered')
      } catch (error: any) {
        toast.error('Failed to save column order')
        setBoard(initialBoard)
      }
      return
    }

    // Handle task movement completion
    if (active.data.current?.type === 'Task') {
      const activeTask = active.data.current.task
      const overColumnId = over.data.current?.type === 'Column' ? overId : over.data.current?.task.columnId

      if (activeTask.columnId !== overColumnId) {
        try {
          const overColumn = board.columns.find((c: Column) => c.id === overColumnId)
          if (overColumn) {
            await updateTaskStatus(activeId as string, overColumnId as string, overColumn.name)
            toast.success(`Task moved to ${overColumn.name}`)
          }
        } catch (error: any) {
          toast.error(error.message || "Failed to move task")
          // Revert board state on error?
          setBoard(initialBoard)
        }
      }
    }
  }

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  }

  return (
    <div className="flex h-full w-full overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-6 h-full min-w-full">
          <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
            {board.columns.map((col: any) => (
              <ColumnContainer 
                key={col.id} 
                column={col} 
                tasks={col.tasks} 
                currentUser={currentUser}
                boardId={board.id}
                onTaskClick={(id) => setSelectedTaskId(id)}
              />
            ))}
          </SortableContext>

          {currentUser.role !== 'MEMBER' && (
            <div className="min-w-[300px] h-full">
              <Button
                variant="outline"
                className="w-full h-14 border-dashed border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all font-oswald uppercase tracking-wider gap-2 rounded-xl"
                onClick={() => setIsAddColumnOpen(true)}
              >
                <Plus className="size-4" />
                Add Column
              </Button>
            </div>
          )}
        </div>

        <AddColumnDialog
          isOpen={isAddColumnOpen}
          onClose={() => setIsAddColumnOpen(false)}
          boardId={board.id}
        />

        <TaskDetailsDialog
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          boardMembers={board.members}
          currentUser={currentUser}
        />

        {typeof document !== 'undefined' && createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {activeColumn && (
              <ColumnContainer
                column={activeColumn}
                tasks={activeColumn.tasks}
                currentUser={currentUser}
                boardId={board.id}
                onTaskClick={() => {}}
              />
            )}
            {activeTask && (
              <TaskCard task={activeTask} />
            )}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
    </div>
  )
}
