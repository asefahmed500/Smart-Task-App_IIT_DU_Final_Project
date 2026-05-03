'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { 
  addChecklist, 
  deleteChecklist, 
  addChecklistItem, 
  toggleChecklistItem, 
  deleteChecklistItem, 
  updateChecklistItem 
} from '@/actions/task-actions'
import { undoLastAction } from '@/actions/board-actions'
import { useOfflineStore } from '@/lib/store/use-offline-store'
import { Task, Checklist, ChecklistItem } from '@/types/kanban'

interface UseTaskChecklistProps {
  taskId: string | null
  task: Task | null
  setTask: React.Dispatch<React.SetStateAction<Task | null>>
  fetchTaskDetails: () => Promise<void>
}

export function useTaskChecklist({ taskId, task, setTask, fetchTaskDetails }: UseTaskChecklistProps) {
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const { isOnline } = useOfflineStore()

  const handleAddChecklist = async () => {
    if (!taskId) return
    const title = prompt('Enter checklist title:', 'New Checklist')
    if (!title) return
    try {
      const result = await addChecklist({ taskId, title })
      if (result.success && result.data) {
        const newCl = result.data as Checklist
        setTask(prev => prev ? { ...prev, checklists: [...(prev.checklists || []), newCl] } : null)
        toast.success('Checklist created', {
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
      }
    } catch {
      toast.error('Failed to create checklist')
    }
  }

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!confirm('Delete this entire checklist?')) return
    try {
      const result = await deleteChecklist({ id: checklistId })
      if (result.success) {
        setTask(prev => prev ? { ...prev, checklists: (prev.checklists || []).filter(cl => cl.id !== checklistId) } : null)
        toast.success('Checklist deleted', {
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
      }
    } catch {
      toast.error('Failed to delete checklist')
    }
  }

  const handleAddChecklistItem = async (checklistId?: string) => {
    if (!newChecklistItem.trim() || !task || !taskId) return
    try {
      let targetChecklistId = checklistId
      
      if (!targetChecklistId) {
        if (task.checklists && task.checklists.length > 0) {
          targetChecklistId = task.checklists[0].id
        } else {
          // Create a new checklist first
          const clResult = await addChecklist({ taskId, title: 'Task Checklist' })
          if (clResult.success && clResult.data) {
            targetChecklistId = (clResult.data as Checklist).id
          } else {
            toast.error(clResult.error || 'Failed to create checklist')
            return
          }
        }
      }

      const result = await addChecklistItem({ taskId, content: newChecklistItem, checklistId: targetChecklistId })
      
      if (result.success && result.data) {
        const item = result.data as ChecklistItem
        const updatedChecklists = (task.checklists || []).map(cl => {
          if (cl.id === targetChecklistId) {
            return { ...cl, items: [...cl.items, item] }
          }
          return cl
        })

        if (!task.checklists?.some(cl => cl.id === targetChecklistId)) {
          updatedChecklists.push({
            id: targetChecklistId!,
            title: 'Task Checklist',
            taskId,
            items: [item]
          })
        }
        
        setTask({ ...task, checklists: updatedChecklists })
        setNewChecklistItem('')
        toast.success('Item added', {
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
        toast.error(result.error || 'Failed to add checklist item')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  const handleToggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    try {
      const result = await toggleChecklistItem({ id: itemId, isCompleted })
      if (result.success) {
        if (task) {
          const updatedChecklists = (task.checklists || []).map((cl: Checklist) => ({
            ...cl,
            items: cl.items.map((item: ChecklistItem) => 
              item.id === itemId ? { ...item, isCompleted } : item
            )
          }))
          setTask({ ...task, checklists: updatedChecklists })
        }
        toast.success('Item updated', {
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
        toast.error(result.error || 'Failed to update item')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(message)
    }
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      const result = await deleteChecklistItem({ id: itemId })
      if (result.success) {
        if (task) {
          const updatedChecklists = (task.checklists || []).map((cl) => ({
            ...cl,
            items: cl.items.filter((item: ChecklistItem) => item.id !== itemId)
          }))
          setTask({ ...task, checklists: updatedChecklists })
        }
        toast.success('Item removed', {
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
        toast.error(result.error || 'Failed to delete item')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  const handleStartEdit = (itemId: string, content: string) => {
    setEditingItemId(itemId)
    setEditingContent(content)
  }

  const handleSaveEdit = async (itemId: string) => {
    if (!editingContent.trim()) return
    try {
      const result = await updateChecklistItem({ id: itemId, content: editingContent })
      if (result.success) {
        if (task) {
          const updatedChecklists = (task.checklists || []).map(cl => ({
            ...cl,
            items: cl.items.map(item => 
              item.id === itemId ? { ...item, content: editingContent } : item
            )
          }))
          setTask({ ...task, checklists: updatedChecklists })
        }
        setEditingItemId(null)
        setEditingContent('')
        toast.success('Item updated', {
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
        toast.error(result.error || 'Failed to update item')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  return {
    newChecklistItem,
    setNewChecklistItem,
    editingItemId,
    setEditingItemId,
    editingContent,
    setEditingContent,
    handleAddChecklist,
    handleDeleteChecklist,
    handleAddChecklistItem,
    handleToggleChecklistItem,
    handleDeleteChecklistItem,
    handleStartEdit,
    handleSaveEdit
  }
}
