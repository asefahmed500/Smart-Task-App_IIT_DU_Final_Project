'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { submitForReview, completeReview } from '@/actions/task-actions'
import { undoLastAction } from '@/actions/board-actions'
import { Task, User, ActionResult } from '@/types/kanban'

interface UseTaskReviewsProps {
  taskId: string | null
  task: Task | null
  setTask: React.Dispatch<React.SetStateAction<Task | null>>
  currentUser: User
  fetchTaskDetails: () => Promise<void>
}

export function useTaskReviews({ taskId, task, setTask, currentUser, fetchTaskDetails }: UseTaskReviewsProps) {
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [selectedReviewer, setSelectedReviewer] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState('')

  const handleSubmitReview = async () => {
    if (!taskId) return
    if (!selectedReviewer) {
      toast.error('Select a reviewer')
      return
    }
    try {
      const result = await submitForReview({ taskId, reviewerId: selectedReviewer })
      if (result.success && result.data) {
        setIsSubmittingReview(false)
        setSelectedReviewer('')
        // Update task state with the new review
        if (task) {
          const newReview = result.data as any
          setTask({ ...task, reviews: [newReview, ...(task.reviews || [])] })
        }
        toast.success('Submitted for review', {
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
        toast.error(result.error || 'Failed to submit review')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  const handleCompleteReview = async (status: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED') => {
    if (!taskId) return
    if ((status === 'CHANGES_REQUESTED' || status === 'REJECTED') && !reviewFeedback) {
      toast.error('Please provide feedback for changes or rejection')
      return
    }
    try {
      const activeReview = task?.reviews?.find(r => r.status === 'PENDING')
      if (!activeReview) return
      
      const result = await completeReview({ id: activeReview.id, status, feedback: reviewFeedback })
      if (result.success && result.data) {
        setReviewFeedback('')
        // Update task state
        if (task) {
          const updatedReview = result.data as any
          setTask({
            ...task,
            reviews: task.reviews?.map(r => r.id === updatedReview.id ? updatedReview : r) || []
          })
        }
        toast.success(`Review completed: ${status}`, {
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
        toast.error(result.error || 'Failed to complete review')
      }
    } catch {
      toast.error('An unexpected error occurred')
    }
  }

  return {
    isSubmittingReview,
    setIsSubmittingReview,
    selectedReviewer,
    setSelectedReviewer,
    reviewFeedback,
    setReviewFeedback,
    handleSubmitReview,
    handleCompleteReview
  }
}
