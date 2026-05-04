'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { addComment, deleteComment, editComment, toggleReaction } from '@/actions/task-actions'
import { undoLastAction } from '@/actions/board-actions'
import { useOfflineStore } from '@/lib/store/use-offline-store'
import { Task, User, Comment as TaskComment, Reaction } from '@/types/kanban'

const REACTION_EMOJIS = ["👍", "🚀", "❤️"]

const FIVE_MINUTES_MS = 5 * 60 * 1000

interface UseTaskCommentsProps {
  taskId: string | null
  task: Task | null
  setTask: React.Dispatch<React.SetStateAction<Task | null>>
  currentUser: User
  fetchTaskDetails: () => Promise<void>
}

export function useTaskComments({ taskId, task, setTask, currentUser, fetchTaskDetails }: UseTaskCommentsProps) {
  const [newComment, setNewComment] = useState('')
  const { isOnline, addAction } = useOfflineStore()

  const handleAddComment = async () => {
    if (!newComment.trim() || !taskId) return
    try {
      if (!isOnline) {
        await addAction({
          type: 'ADD_COMMENT',
          payload: { taskId: taskId, content: newComment }
        })
        if (task) {
          const tempComment: TaskComment = {
            id: crypto.randomUUID(),
            content: newComment,
            taskId: taskId,
            userId: currentUser.id,
            user: currentUser,
            createdAt: new Date(),
            updatedAt: new Date()
          }
          setTask({ ...task, comments: [tempComment, ...(task.comments || [])] })
        }
        setNewComment('')
        toast.success('Comment queued (offline)')
        return
      }

      const result = await addComment({ taskId: taskId, content: newComment })
      if (result.success && result.data) {
        const comment = result.data as TaskComment
        if (task) {
          setTask({ ...task, comments: [comment, ...(task.comments || [])] })
        }
        setNewComment('')
        toast.success('Comment added', {
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
        toast.error(result.error || 'Failed to add comment')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    try {
      const result = await deleteComment({ id: commentId })
      if (result.success) {
        if (task) {
          setTask({ ...task, comments: (task.comments || []).filter(c => c.id !== commentId) })
        }
        toast.success('Comment deleted', {
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
        toast.error(result.error || 'Failed to delete comment')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred'
      toast.error(message)
    }
  }

  const isCommentEditable = (comment: TaskComment): boolean => {
    const ageMs = Date.now() - new Date(comment.createdAt).getTime()
    return comment.userId === currentUser.id && ageMs < FIVE_MINUTES_MS
  }

  const handleEditComment = async (commentId: string, content: string) => {
    try {
      const result = await editComment({ id: commentId, content })
      if (result.success) {
        toast.success("Comment updated")
        await fetchTaskDetails()
      } else {
        toast.error(result.error || "Failed to edit comment")
      }
    } catch (error) {
      toast.error("Failed to edit comment")
    }
  }

  const handleToggleReaction = async (commentId: string, emoji: string) => {
    try {
      const result = await toggleReaction({ commentId, emoji })
      if (result.success && result.data) {
        if (task) {
          setTask({
            ...task,
            comments: (task.comments || []).map((c) =>
              c.id === commentId ? result.data as TaskComment : c
            ),
          })
        }
      }
    } catch {
      toast.error("Failed to toggle reaction")
    }
  }

  return {
    newComment,
    setNewComment,
    handleAddComment,
    handleDeleteComment,
    handleEditComment,
    handleToggleReaction,
    isCommentEditable,
  }
}
