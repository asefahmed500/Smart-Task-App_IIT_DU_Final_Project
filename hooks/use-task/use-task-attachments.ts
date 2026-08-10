'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { deleteAttachment } from '@/actions/task-actions'
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

    // Client-side 10MB limit (server enforces it too via /api/attachments/upload)
    const TEN_MB = 10 * 1024 * 1024
    if (file.size > TEN_MB) {
      toast.error('File size exceeds 10MB limit')
      return
    }

    setIsUploading(true)
    try {
      // Send the raw file to the server-side upload route. The server
      // validates size/type/permission and stores the bytes in the DB
      // (FileBlob). The file is NOT read client-side as base64.
      const form = new FormData()
      form.append('taskId', taskId)
      form.append('file', file)

      const res = await fetch('/api/attachments/upload', { method: 'POST', body: form })
      const result = await res.json()

      if (res.ok && result.success && result.data) {
        const attachment = result.data as Attachment
        if (task) {
          setTask({
            ...task,
            attachments: [...(task.attachments || []), attachment],
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
            },
          },
        })
      } else {
        toast.error(result.error || 'Failed to upload file')
      }
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ''
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
