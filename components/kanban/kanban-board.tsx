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
import { reorderColumns, undoLastAction } from '@/lib/board-actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Plus, AlertTriangle, ShieldAlert } from 'lucide-react'
import { AddColumnDialog } from './add-column-dialog'
import { TaskDetailsDialog } from './task-details-dialog'
import { useSocket, useBoardEvents, emitTaskMoved } from './socket-hooks'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PresenceAvatars } from './presence-avatars'
import { ConflictDialog } from './conflict-dialog'
import { useOfflineStore } from '@/lib/store/use-offline-store'

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
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [conflictTaskData, setConflictTaskData] = useState<any>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  
  const { isOnline, addAction } = useOfflineStore()

  const { presence } = useSocket(initialBoard.id, {
    id: currentUser.id,
    name: currentUser.name || currentUser.email,
    image: currentUser.image
  })

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

  const handleUndo = async () => {
    try {
      const result = await undoLastAction()
      if (result.success) {
        toast.success('Action undone')
      } else {
        toast.error(result.error || 'Failed to undo')
      }
    } catch (error) {
      toast.error('Failed to undo last action')
    }
  }

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
        const result = await reorderColumns({ boardId: board.id, columnIds: newColumns.map((c: Column) => c.id) })
        if (result.success) {
          toast.success('Columns reordered', {
            action: {
              label: 'Undo',
              onClick: handleUndo
            }
          })
        } else {
          toast.error(result.error || 'Failed to save column order')
          setBoard(initialBoard)
        }
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
            if (!isOnline) {
              await addAction({
                type: 'MOVE_TASK',
                payload: {
                  taskId: activeTask.id,
                  columnId: overColumn.id,
                  statusName: overColumn.name,
                  version: activeTask.version
                }
              })
              
              emitTaskMoved(board.id, {
                taskId: activeId as string,
                newColumnId: overColumnId as string,
                oldColumnId,
                userId: currentUser.id,
                userName: currentUser.name || currentUser.email
              })
              
              toast.success(`Task moved locally (offline)`)
              return
            }

            const result = await updateTaskStatus({
              taskId: activeTask.id,
              columnId: overColumn.id,
              statusName: overColumn.name,
              version: activeTask.version
            })
            
            if (result.success) {
              emitTaskMoved(board.id, {
                taskId: activeId as string,
                newColumnId: overColumnId as string,
                oldColumnId,
                userId: currentUser.id,
                userName: currentUser.name || currentUser.email
              })
              
              toast.success(`Task moved to ${overColumn.name}`, {
                action: {
                  label: 'Undo',
                  onClick: handleUndo
                }
              })
            } else {
              const message = result.error || "Failed to move task"
              if (message.includes('Conflict')) {
                setConflictTaskData({
                  taskId: activeId as string,
                  columnId: overColumnId as string,
                  statusName: overColumn.name
                })
                setConflictModalOpen(true)
              } else {
                toast.error(message)
              }
              setBoard(initialBoard)
            }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to move task"
        if (message.includes('Conflict')) {
          setConflictTaskData({
            taskId: activeId as string,
            columnId: overColumnId as string,
            statusName: overColumn.name
          })
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

  const handleResolveConflict = async () => {
    if (!conflictTaskData) return
    
    try {
      const result = await updateTaskStatus({
        ...conflictTaskData,
        version: undefined // This will bypass conflict check on server
      })
      
      if (result.success) {
        toast.success("Task updated (overwritten)")
        setConflictModalOpen(false)
        setConflictTaskData(null)
      } else {
        toast.error(result.error || "Failed to resolve conflict")
      }
    } catch (error) {
      toast.error("Failed to resolve conflict")
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
    <>
      <div className="flex h-full w-full overflow-x-auto overflow-y-hidden pb-4 scrollbar-thin scrollbar-thumb-primary/10 scrollbar-track-transparent">
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex flex-col gap-4 min-w-full">
            {/* WIP Status Summary */}
            <div className="flex items-center gap-3 px-1">
              {board.columns.some(col => col.wipLimit > 0 && col.tasks.length > col.wipLimit) ? (
                <div className="flex items-center gap-2 text-xs font-medium text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 animate-pulse">
                  <ShieldAlert className="size-3.5" />
                  WIP Limit Violation Detected
                </div>
              ) : board.columns.some(col => col.wipLimit > 0 && col.tasks.length === col.wipLimit) ? (
                <div className="flex items-center gap-2 text-xs font-medium text-yellow-600 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20">
                  <AlertTriangle className="size-3.5" />
                  Some columns are at capacity
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                  <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Flow is within limits
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Active Now</span>
                <PresenceAvatars users={presence} />
              </div>
              
              <div className="flex items-center gap-2">
                {/* Stats or other tools could go here */}
              </div>
            </div>

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

          <ConflictDialog 
            isOpen={conflictModalOpen}
            onClose={() => setConflictModalOpen(false)}
            onRefresh={handleRefresh}
            onResolve={handleResolveConflict}
          />
    </>
  )
}