'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTaskActivityLog } from '@/actions/task-actions'
import { ActionResult } from '@/types/kanban'
import { useBoardEvents } from '@/components/kanban/socket-hooks'

interface UseTaskActivityProps {
  taskId: string | null
  isOpen: boolean
  boardId?: string
}

export function useTaskActivity({ taskId, isOpen, boardId }: UseTaskActivityProps) {
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [activityFilter, setActivityFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(false)

  const fetchActivityLog = useCallback(async () => {
    if (!taskId) return
    setIsLoading(true)
    try {
      const result = await getTaskActivityLog({ id: taskId })
      if (result.success && result.data) {
        setActivityLog(result.data as any[])
      }
    } catch (error) {
      console.error('Failed to load activity log', error)
    } finally {
      setIsLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    if (isOpen && taskId) {
      fetchActivityLog()
    }
  }, [isOpen, taskId, fetchActivityLog])

  // Real-time refresh on task events
  const handleBoardEvent = useCallback((event: string, data: Record<string, unknown>) => {
    if (taskId && (data.taskId === taskId || (data.task as any)?.id === taskId)) {
      fetchActivityLog()
    }
  }, [taskId, fetchActivityLog])

  useBoardEvents(boardId || 'none', handleBoardEvent)

  const filteredActivityLog = activityFilter === 'all'
    ? activityLog
    : activityLog.filter(log => log.action === activityFilter)

  return {
    activityLog,
    filteredActivityLog,
    activityFilter,
    setActivityFilter,
    isLoading,
    refreshActivity: fetchActivityLog
  }
}
