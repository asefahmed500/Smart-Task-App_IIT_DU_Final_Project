'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { addTagToTask, removeTagFromTask, getBoardTags } from '@/actions/task-actions'
import { undoLastAction } from '@/actions/board-actions'
import { Task, Tag, ActionResult } from '@/types/kanban'

interface UseTaskTagsProps {
  taskId: string | null
  task: Task | null
  setTask: React.Dispatch<React.SetStateAction<Task | null>>
  fetchTaskDetails: () => Promise<void>
}

export function useTaskTags({ taskId, task, setTask, fetchTaskDetails }: UseTaskTagsProps) {
  const [boardTags, setBoardTags] = useState<Tag[]>([])

  useEffect(() => {
    if (task?.column?.boardId) {
      getBoardTags({ boardId: task.column.boardId }).then((result: ActionResult) => {
        if (result.success) {
          setBoardTags(result.data as Tag[])
        }
      })
    }
  }, [task?.column?.boardId])

  const handleAddTag = async (tagId: string) => {
    if (!taskId) return
    try {
      const result = await addTagToTask({ taskId, tagId })
      if (result.success) {
        if (task) {
          const newTag = boardTags.find(t => t.id === tagId)
          if (newTag) {
            setTask({ ...task, tags: [...(task.tags || []), newTag] })
          } else {
            // Fallback to full fetch if tag not found in local list
            fetchTaskDetails()
          }
        }
        toast.success('Tag added', {
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
        toast.error(result.error || 'Failed to add tag')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    if (!taskId) return
    try {
      const result = await removeTagFromTask({ taskId, tagId })
      if (result.success) {
        if (task) {
          setTask({ ...task, tags: (task.tags || []).filter(t => t.id !== tagId) })
        }
        toast.success('Tag removed', {
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
        toast.error(result.error || 'Failed to remove tag')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  return {
    boardTags,
    handleAddTag,
    handleRemoveTag
  }
}
