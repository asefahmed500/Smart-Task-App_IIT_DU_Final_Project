'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { logTime, getTimeEntries } from '@/actions/task-actions'
import { undoLastAction } from '@/actions/board-actions'
import { TimeEntry, ActionResult } from '@/types/kanban'

interface UseTaskTimeProps {
  taskId: string | null
  isOpen: boolean
  fetchTaskDetails: () => Promise<void>
}

export function useTaskTime({ taskId, isOpen, fetchTaskDetails }: UseTaskTimeProps) {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [isLoggingTime, setIsLoggingTime] = useState(false)
  const [timeDuration, setTimeDuration] = useState('')
  const [timeDescription, setTimeDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchTimeEntries = useCallback(async () => {
    if (!taskId) return
    setIsLoading(true)
    try {
      const result = await getTimeEntries({ id: taskId })
      if (result.success && result.data) {
        setTimeEntries(result.data as TimeEntry[])
      }
    } catch (error) {
      console.error('Failed to load time entries', error)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTimeEntries()
    }
  }, [isOpen, taskId, fetchTimeEntries])

  const handleLogTime = async () => {
    if (!taskId) return
    const duration = parseInt(timeDuration)
    if (isNaN(duration) || duration <= 0) {
      toast.error('Invalid duration')
      return
    }
    try {
      const result = await logTime({ taskId, duration, description: timeDescription })
      if (result.success && result.data) {
        const entry = result.data as TimeEntry
        setTimeEntries([entry, ...timeEntries])
        setIsLoggingTime(false)
        setTimeDuration('')
        setTimeDescription('')
        toast.success('Time logged', {
          action: {
            label: 'Undo',
            onClick: async () => {
              const undoResult = await undoLastAction()
              if (undoResult.success) {
                toast.success('Action undone')
                fetchTimeEntries()
                fetchTaskDetails()
              } else {
                toast.error(undoResult.error || 'Failed to undo')
              }
            }
          }
        })
      } else {
        toast.error(result.error || 'Failed to log time')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  return {
    timeEntries,
    isLoggingTime,
    setIsLoggingTime,
    timeDuration,
    setTimeDuration,
    timeDescription,
    setTimeDescription,
    isLoading,
    handleLogTime,
    refreshTimeEntries: fetchTimeEntries
  }
}
