'use client'

import { useState, useEffect, useCallback } from 'react'
import { getTaskActivityLog } from '@/actions/task-actions'
import { ActionResult } from '@/types/kanban'

interface UseTaskActivityProps {
  taskId: string | null
  isOpen: boolean
}

export function useTaskActivity({ taskId, isOpen }: UseTaskActivityProps) {
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
