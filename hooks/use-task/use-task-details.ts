'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { 
  getTaskDetails, 
  updateTask, 
  deleteTask, 
  getAllUsers 
} from '@/actions/task-actions'
import { undoLastAction } from '@/actions/board-actions'
import { useOfflineStore } from '@/lib/store/use-offline-store'
import { Task, User, Priority, ActionResult } from '@/types/kanban'

interface UseTaskDetailsProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  currentUser: User
  isAdmin: boolean
}

export function useTaskDetails({ taskId, isOpen, onClose, currentUser, isAdmin }: UseTaskDetailsProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [conflictData, setConflictData] = useState<{ field: string, value: any } | null>(null)
  
  const { isOnline, addAction } = useOfflineStore()
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const fetchTaskDetails = useCallback(async () => {
    if (!taskId) return
    setLoading(true)
    try {
      const result = await getTaskDetails({ id: taskId })
      if (result.success && result.data) {
        setTask(result.data as Task)
      } else {
        toast.error(result.error || 'Failed to load task details')
        onCloseRef.current()
      }
    } catch {
      toast.error('An unexpected error occurred')
      onCloseRef.current()
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails()
    }
  }, [isOpen, taskId, fetchTaskDetails])

  useEffect(() => {
    if (isOpen && isAdmin) {
      getAllUsers().then((result: ActionResult) => {
        if (result.success && result.data) {
          setAllUsers(result.data as User[])
        }
      }).catch((error: unknown) => {
        console.error('Failed to fetch all users:', error)
      })
    }
  }, [isOpen, isAdmin])

  const handleUpdate = async (field: string, value: string | Priority | null) => {
    if (!task || !taskId) return
    setUpdating(true)
    try {
      if (!isOnline) {
        await addAction({
          type: 'EDIT_TASK',
          payload: { id: taskId, [field]: value, version: task.version }
        })
        setTask({ ...task, [field]: value } as Task)
        toast.success('Update queued (offline)')
        return
      }

      const result = await updateTask({ id: taskId, [field]: value, version: task.version })
      if (result.success) {
        setTask({ ...task, [field]: value } as Task)
        toast.success('Task updated', {
          action: {
            label: 'Undo',
            onClick: async () => {
              const undoResult = await undoLastAction()
              if (undoResult.success) {
                toast.success('Action undone')
                fetchTaskDetails()
              } else {
                toast.error(undoResult.error || 'Failed to undo')
              }
            }
          }
        })
      } else {
        const message = result.error || 'Failed to update task'
        if (message.includes('Conflict')) {
          setConflictData({ field, value })
          setConflictModalOpen(true)
        } else {
          toast.error(message)
        }
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setUpdating(false)
    }
  }

  const handleResolveConflict = async () => {
    if (!conflictData || !task || !taskId) return
    try {
      const result = await updateTask({ 
        id: taskId, 
        [conflictData.field]: conflictData.value,
        version: undefined // Force bypass
      })
      if (result.success) {
        setTask({ ...task, [conflictData.field]: conflictData.value } as Task)
        toast.success('Conflict resolved (overwritten)')
        setConflictModalOpen(false)
        setConflictData(null)
      } else {
        toast.error(result.error || 'Failed to resolve conflict')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  const handleDelete = async () => {
    if (!taskId) return
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      const result = await deleteTask({ id: taskId })
      if (result.success) {
        toast.success('Task deleted', {
          action: {
            label: 'Undo',
            onClick: async () => {
              const undoResult = await undoLastAction()
              if (undoResult.success) {
                toast.success('Task restored')
              } else {
                toast.error(undoResult.error || 'Failed to undo')
              }
            },
          },
        })
        onClose()
      } else {
        toast.error(result.error || 'Failed to delete task')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  return {
    task,
    setTask,
    loading,
    updating,
    allUsers,
    conflictModalOpen,
    setConflictModalOpen,
    handleUpdate,
    handleDelete,
    handleResolveConflict,
    fetchTaskDetails
  }
}
