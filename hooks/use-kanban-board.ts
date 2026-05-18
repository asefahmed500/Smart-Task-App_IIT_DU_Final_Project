'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [board, setBoard] = useState<Board>(initialBoard)
  const [activeColumn, setActiveColumn] = useState<Column | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [isAddColumnOpen, setIsAddColumnOpen] = useState(false)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [conflictTaskData, setConflictTaskData] = useState<any>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  
  const { isOnline, addAction } = useOfflineStore()

  const isDraggingRef = useRef(false)
  const dragTargetRef = useRef<Record<string, string>>({})
  const boardRef = useRef(initialBoard)
  boardRef.current = board

  useEffect(() => {
    setBoard(initialBoard)
  }, [initialBoard.id, initialBoard.updatedAt])

  const stableUser = useMemo(() => ({
    id: currentUser.id,
    name: currentUser.name || currentUser.email,
    image: currentUser.image
  }), [currentUser.id, currentUser.name, currentUser.email])

  const { isConnected, presence, editingTasks } = useSocket(initialBoard.id, stableUser)

  const handleBoardEvent = useCallback((event: string, data: Record<string, unknown>) => {
    if (event === 'task:moved') {
      if (data.userId === currentUser.id || isDraggingRef.current) return
      const oldColId = (data.oldColumnId ?? data.previousColumnId) as string | undefined
      const newColId = (data.newColumnId ?? data.columnId) as string | undefined
      if (!oldColId || !newColId) return
      setBoard((prev: Board) => {
        const newColumns = prev.columns.map((col: Column) => {
          if (col.id === oldColId) {
            const filtered = col.tasks.filter((t: Task) => t.id !== data.taskId)
            if (filtered.length === col.tasks.length) return col
            return { ...col, tasks: filtered }
          }
          if (col.id === newColId) {
            if (col.tasks.some((t: Task) => t.id === data.taskId)) return col
            const task = prev.columns
              .flatMap((c: Column) => c.tasks)
              .find((t: Task) => t.id === data.taskId)
            if (task) {
              return { ...col, tasks: [...col.tasks, { ...task, columnId: newColId }] }
            }
          }
          return col
        })
        return { ...prev, columns: newColumns }
      })
      const userName = (data.userName ?? (data.user as any)?.name ?? 'Someone') as string
      toast.info(`${userName} moved a task`)
    }

    if (event === 'task:updated') {
      if (data.userId === currentUser.id) return
      if (data.task) {
        const updatedTask = data.task as Task
        setBoard((prev: Board) => {
          const newColumns = prev.columns.map((col: Column) => {
            const taskIndex = col.tasks.findIndex((t: Task) => t.id === updatedTask.id)
            if (taskIndex !== -1) {
              if (col.id === updatedTask.columnId) {
                const newTasks = [...col.tasks]
                newTasks[taskIndex] = updatedTask
                return { ...col, tasks: newTasks }
              } else {
                return { ...col, tasks: col.tasks.filter((t: Task) => t.id !== updatedTask.id) }
              }
            }
            if (col.id === updatedTask.columnId) {
              return { ...col, tasks: [...col.tasks, updatedTask] }
            }
            return col
          })
          return { ...prev, columns: newColumns }
        })
      } else if (data.taskId) {
        toast.info('A task was updated')
      }
    }

    if (event === 'task:created') {
      if (data.task) {
        const newTask = data.task as Task
        setBoard((prev: Board) => {
          const newColumns = prev.columns.map((col: Column) => {
            if (col.id === newTask.columnId) {
              return { ...col, tasks: [...col.tasks, newTask] }
            }
            return col
          })
          return { ...prev, columns: newColumns }
        })
        toast.info('A new task was created')
      }
    }

    if (event === 'task:deleted') {
      if (data.taskId) {
        setBoard((prev: Board) => {
          const newColumns = prev.columns.map((col: Column) => ({
            ...col,
            tasks: col.tasks.filter((t: Task) => t.id !== data.taskId)
          }))
          return { ...prev, columns: newColumns }
        })
        toast.info('A task was deleted')
      }
    }

    if (event === 'column:created') {
      if (data.column) {
        const newColumn = data.column as Column
        setBoard((prev: Board) => ({
          ...prev,
          columns: [...prev.columns, { ...newColumn, tasks: [] }]
        }))
        toast.info('A new column was created')
      }
    }

    if (event === 'column:deleted') {
      if (data.columnId) {
        const colId = data.columnId as string
        const targetId = data.targetColumnId as string | undefined
        const movedIds = data.movedTaskIds as string[] | undefined

        setBoard((prev: Board) => {
          const newColumns = prev.columns
            .filter((col: Column) => col.id !== colId)
            .map((col: Column) => {
              if (targetId && col.id === targetId && movedIds && movedIds.length > 0) {
                const tasksToMove = prev.columns
                  .find((c: Column) => c.id === colId)?.tasks
                  .filter((t: Task) => movedIds.includes(t.id)) || []
                return { ...col, tasks: [...col.tasks, ...tasksToMove] }
              }
              return col
            })
          return { ...prev, columns: newColumns }
        })
        toast.info('A column was deleted')
      }
    }

    if (event === 'column:updated') {
      if (data.column) {
        const updatedColumn = data.column as Column
        setBoard((prev: Board) => ({
          ...prev,
          columns: prev.columns.map((col: Column) =>
            col.id === updatedColumn.id ? { ...col, ...updatedColumn } : col
          )
        }))
      }
    }

    if (event === 'columns:reordered') {
      if (data.columnIds) {
        const columnIds = data.columnIds as string[]
        setBoard((prev: Board) => {
          const columnMap = new Map(prev.columns.map((col: Column) => [col.id, col]))
          const reordered = columnIds
            .map((id: string) => columnMap.get(id))
            .filter(Boolean) as Column[]
          return { ...prev, columns: reordered }
        })
        toast.info('Columns were reordered')
      }
    }

    if (event === 'board:updated') {
      if (data.name) {
        setBoard((prev: Board) => ({ ...prev, name: data.name as string }))
        toast.info('Board was updated')
      }
    }

    if (event === 'board:deleted') {
      toast.info('Board was deleted')
      router.push('/dashboard')
    }

    if (event === 'board:member_added' || event === 'board:member_removed') {
      router.refresh()
    }

    if (event === 'tag:created' || event === 'tag:deleted') {
      router.refresh()
    }
  }, [currentUser.id, router])

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

  const onDragStart = useCallback((event: DragStartEvent) => {
    isDraggingRef.current = true
    dragTargetRef.current = {}

    if (event.active.data.current?.type === 'Column') {
      setActiveColumn(event.active.data.current.column)
      return
    }

    if (event.active.data.current?.type === 'Task') {
      setActiveTask(event.active.data.current.task)
      return
    }
  }, [])

  const onDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    if (activeId === overId) return

    const isActiveATask = active.data.current?.type === 'Task'
    const isOverATask = over.data.current?.type === 'Task'

    if (!isActiveATask) return

    if (isActiveATask && isOverATask) {
      setBoard((prev: Board) => {
        const activeColumn = prev.columns.find((c: Column) => c.tasks.some((t: Task) => t.id === activeId))
        const overColumn = prev.columns.find((c: Column) => c.tasks.some((t: Task) => t.id === overId))

        if (activeColumn && overColumn && activeColumn.id !== overColumn.id) {
          if (dragTargetRef.current[activeId] === overColumn.id) return prev
          dragTargetRef.current[activeId] = overColumn.id

          const newColumns = prev.columns.map((col: Column) => {
            if (col.id === activeColumn.id) {
              return { ...col, tasks: col.tasks.filter((t: Task) => t.id !== activeId) }
            }
            if (col.id === overColumn.id) {
              const activeTask = activeColumn.tasks.find((t: Task) => t.id === activeId)
              if (!activeTask) return col
              const newTasks = [...col.tasks]
              const targetIndex = col.tasks.findIndex((t: Task) => t.id === overId)
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

    const isOverAColumn = over.data.current?.type === 'Column'
    if (isActiveATask && isOverAColumn) {
      const overColumnId = overId as string
      if (dragTargetRef.current[activeId] === overColumnId) return

      dragTargetRef.current[activeId] = overColumnId
      setBoard((prev: Board) => {
        const activeColumn = prev.columns.find((c: Column) => c.tasks.some((t: Task) => t.id === activeId))

        if (activeColumn && activeColumn.id !== overColumnId) {
          const overColumn = prev.columns.find((c: Column) => c.id === overColumnId)
          const activeTask = activeColumn.tasks.find((t: Task) => t.id === activeId)

          if (overColumn?.wipLimit && overColumn.wipLimit > 0 && activeTask) {
            const userRole = currentUser.role
            if (userRole !== 'ADMIN' && userRole !== 'MANAGER') {
              if (overColumn.tasks.length >= overColumn.wipLimit) return prev
            }
          }

          if (!activeTask) return prev
          const newColumns = prev.columns.map((col: Column) => {
            if (col.id === activeColumn.id) {
              return { ...col, tasks: col.tasks.filter((t: Task) => t.id !== activeId) }
            }
            if (col.id === overColumnId) {
              return { ...col, tasks: [...col.tasks, activeTask] }
            }
            return col
          })
          return { ...prev, columns: newColumns }
        }
        return prev
      })
    }
  }, [])

  const onDragEnd = async (event: DragEndEvent) => {
    isDraggingRef.current = false
    dragTargetRef.current = {}
    setActiveColumn(null)
    setActiveTask(null)

    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    if (active.data.current?.type === 'Column' && over.data.current?.type === 'Column') {
      const activeIndex = boardRef.current.columns.findIndex((c: Column) => c.id === activeId)
      const overIndex = boardRef.current.columns.findIndex((c: Column) => c.id === overId)
      const newColumns = arrayMove(boardRef.current.columns, activeIndex, overIndex)
      
      setBoard((prev: Board) => ({ ...prev, columns: newColumns }))
      
      try {
        const result = await reorderColumns({ boardId: boardRef.current.id, columnIds: newColumns.map((c: Column) => c.id) })
        if (result.success) {
          toast.success('Columns reordered', {
            action: {
              label: 'Undo',
              onClick: handleUndo
            }
          })
        } else {
          toast.error(result.error || 'Failed to save column order')
          router.refresh()
        }
      } catch {
        toast.error('Failed to save column order')
        router.refresh()
      }
      return
    }

    if (active.data.current?.type === 'Task') {
      const activeTask = active.data.current.task
      const overColumnId = over.data.current?.type === 'Column' ? overId as string : over.data.current?.task?.columnId

      if (activeTask.columnId !== overColumnId && overColumnId) {
        const overColumn = boardRef.current.columns.find((c: Column) => c.id === overColumnId)
        
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
                newColumnId: overColumnId,
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
                newColumnId: overColumnId,
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
                  columnId: overColumnId,
                  statusName: overColumn.name
                })
                setConflictModalOpen(true)
              } else {
                toast.error(message)
              }
              router.refresh()
            }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to move task"
            if (message.includes('Conflict')) {
              setConflictTaskData({
                taskId: activeId as string,
                columnId: overColumnId,
                statusName: overColumn.name
              })
              setConflictModalOpen(true)
            } else {
              toast.error(message)
            }
            router.refresh()
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
    isConnected,
    presence,
    editingTasks,
    onDragStart,
    onDragOver,
    onDragEnd,
    handleRefresh,
    handleResolveConflict,
    handleUndo
  }
}
