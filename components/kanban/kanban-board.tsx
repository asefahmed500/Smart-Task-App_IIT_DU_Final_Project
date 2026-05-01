'use client'

import { useState, useMemo, useCallback } from 'react'
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
} from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'
import { ColumnContainer } from './column-container'
import { TaskCard } from './task-card'
import { updateTaskStatus } from '@/lib/task-actions'
import { reorderColumns } from '@/lib/board-actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { AddColumnDialog } from './add-column-dialog'
import { TaskDetailsDialog } from './task-details-dialog'
import { useSocket, useBoardEvents, emitTaskMoved } from './socket-hooks'

import { Board, Task, Column, User } from '@/types/kanban'

interface KanbanBoardProps {
  board: Board
  currentUser: User
}

export function KanbanBoard({ board: initialBoard, currentUser }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board>(initialBoard)
  const [activeColumn, setActiveColumn] = useState<Column | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)

  useSocket(initialBoard.id)

  const handleBoardEvent = useCallback((event: string, data: Record<string, unknown>) => {
    if (event === 'task:moved') {
      setBoard((prev: Board) => {
        const newColumns = prev.columns.map((col: Column) => {
          if (col.id === data.oldColumnId) {
            return { ...col, tasks: col.tasks.filter((t: Task) => t.id !== data.taskId) }
          }
          if (col.id === data.newColumnId) {
            const task = prev.columns
              .flatMap((c: Column) => c.tasks)
              .find((t: Task) => t.id === data.taskId)
            if (task) {
              return { ...col, tasks: [...col.tasks, { ...task, columnId: data.newColumnId }] }
            }
          }
          return col
        })
        return { ...prev, columns: newColumns }
      })
      toast.info(`${data.userName} moved a task`)
    }
  }, [])

  useBoardEvents(initialBoard.id, handleBoardEvent)

  const columnsId = useMemo(() => board.columns.map((col: Column) => col.id), [board.columns])

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

    if (isActiveATask && isOverATask) {
      setBoard((prev: Board) => {
        const activeColumn = prev.columns.find((c: Column) => c.tasks.some((t: Task) => t.id === activeId))
        const overColumn = prev.columns.find((c: Column) => c.tasks.some((t: Task) => t.id === overId))

        if (activeColumn && overColumn && activeColumn.id !== overColumn.id) {
          const newColumns = prev.columns.map((col: Column) => {
            if (col.id === activeColumn.id) {
              return { ...col, tasks: col.tasks.filter((t: Task) => t.id !== activeId) }
            }
            if (col.id === overColumn.id) {
              const activeTask = activeColumn.tasks.find((t: Task) => t.id === activeId)
              const newTasks = [...col.tasks]
              const targetIndex = col.tasks.findIndex((t: Task) => t.id === overId)
              newTasks.splice(targetIndex, 0, activeTask!)
              return { ...col, tasks: newTasks }
            }
            return col
          })
          return { ...prev, columns: newColumns }
        }

        return prev
      })
    }

    const isOverAColumn = over.data.current?.type === 'Column'
    if (isActiveATask && isOverAColumn) {
      setBoard((prev: Board) => {
        const activeColumn = prev.columns.find((c: Column) => c.tasks.some((t: Task) => t.id === activeId))
        const overColumnId = overId as string

        if (activeColumn && activeColumn.id !== overColumnId) {
          const newColumns = prev.columns.map((col: Column) => {
            if (col.id === activeColumn.id) {
              return { ...col, tasks: col.tasks.filter((t: Task) => t.id !== activeId) }
            }
            if (col.id === overColumnId) {
              const activeTask = activeColumn.tasks.find((t: Task) => t.id === activeId)
              return { ...col, tasks: [...col.tasks, activeTask!] }
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

    if (active.data.current?.type === 'Column' && over.data.current?.type === 'Column') {
      const activeIndex = board.columns.findIndex((c: Column) => c.id === activeId)
      const overIndex = board.columns.findIndex((c: Column) => c.id === overId)
      const newColumns = arrayMove(board.columns, activeIndex, overIndex)
      
      setBoard((prev: Board) => ({ ...prev, columns: newColumns }))
      
      try {
        await reorderColumns(board.id, newColumns.map((c: Column) => c.id))
        toast.success('Columns reordered')
      } catch {
        toast.error('Failed to save column order')
        setBoard(initialBoard)
      }
      return
    }

    if (active.data.current?.type === 'Task') {
      const activeTask = active.data.current.task
      const overColumnId = over.data.current?.type === 'Column' ? overId : over.data.current?.task.columnId

      if (activeTask.columnId !== overColumnId) {
        const overColumn = board.columns.find((c: Column) => c.id === overColumnId)
        
        if (overColumn) {
          const oldColumnId = activeTask.columnId
          
          try {
            await updateTaskStatus(
              activeId as string, 
              overColumnId as string, 
              overColumn.name,
              activeTask.version
            )
            
            emitTaskMoved(board.id, {
              taskId: activeId as string,
              newColumnId: overColumnId as string,
              oldColumnId,
              userId: currentUser.id,
              userName: currentUser.name || currentUser.email
            })
            
            toast.success(`Task moved to ${overColumn.name}`)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to move task"
        if (message.includes('Conflict')) {
          setConflictModalOpen(true)
        } else {
          toast.error(message)
        }
        setBoard(initialBoard)
      }
        }
      }
    }
  }

  const handleRefresh = () => {
    window.location.reload()
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
    <>
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
              {board.columns.map((col: Column) => (
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

      {conflictModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background p-6 rounded-lg shadow-lg max-w-md">
            <h3 className="text-lg font-semibold mb-2">Conflict Detected</h3>
            <p className="text-muted-foreground mb-4">
              This task was modified by another user. Would you like to refresh or force update?
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRefresh}>
                Refresh
              </Button>
              <Button onClick={() => setConflictModalOpen(false)}>
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}