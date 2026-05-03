'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { updateTaskStatus } from '@/actions/task-actions'
import { reorderColumns, undoLastAction } from '@/actions/board-actions'
import { useSocket, useBoardEvents, emitTaskMoved } from '@/components/kanban/socket-hooks'
import { useOfflineStore } from '@/lib/store/use-offline-store'
import { Board, Task, Column, User } from '@/types/kanban'

interface UseKanbanBoardProps {
  initialBoard: Board
  currentUser: User
}

export function useKanbanBoard({ initialBoard, currentUser }: UseKanbanBoardProps) {
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
              return { ...col, tasks: [...col.tasks, { ...task, columnId: data.newColumnId as string }] }
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

  return {
    board,
    activeColumn,
    activeTask,
    isAddColumnOpen,
    setIsAddColumnOpen,
    conflictModalOpen,
    setConflictModalOpen,
    selectedTaskId,
    setSelectedTaskId,
    presence,
    onDragStart,
    onDragOver,
    onDragEnd,
    handleRefresh,
    handleResolveConflict,
    handleUndo
  }
}
