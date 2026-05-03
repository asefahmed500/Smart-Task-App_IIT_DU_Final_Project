'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { addAttachment, deleteAttachment } from '@/actions/task-actions'
import { undoLastAction } from '@/actions/board-actions'
import { Task, Attachment } from '@/types/kanban'

interface UseTaskAttachmentsProps {
  taskId: string | null
  task: Task | null
  setTask: React.Dispatch<React.SetStateAction<Task | null>>
  fetchTaskDetails: () => Promise<void>
}

export function useTaskAttachments({ taskId, task, setTask, fetchTaskDetails }: UseTaskAttachmentsProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !taskId) return

    setIsUploading(true)
    try {
      // Simulation of file upload (using FileReader for demo)
      const reader = new FileReader()
      reader.onloadend = async () => {
        const result = await addAttachment({
          taskId,
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string // Base64 for demo
        })
        
        if (result.success && result.data) {
          const attachment = result.data as Attachment
          if (task) {
            setTask({
              ...task,
              attachments: [...(task.attachments || []), attachment]
            })
          }
          toast.success('File attached successfully', {
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
          toast.error(result.error || 'Failed to upload file')
        }
        setIsUploading(false)
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('An unexpected error occurred')
      setIsUploading(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) return
    try {
      const result = await deleteAttachment({ id: attachmentId })
      if (result.success) {
        if (task) {
          setTask({
            ...task,
            attachments: (task.attachments || []).filter(a => a.id !== attachmentId)
          })
        }
        toast.success('Attachment deleted', {
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
        toast.error(result.error || 'Failed to delete attachment')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  return {
    isUploading,
    handleUpload,
    handleDeleteAttachment
  }
}
