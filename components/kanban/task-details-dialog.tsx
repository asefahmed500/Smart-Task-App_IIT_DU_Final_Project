'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  MessageSquare, 
  Paperclip, 
  CheckSquare, 
  Clock, 
  Trash2,
  X,
  Send,
  Loader2,
  Edit2,
  Plus, 
  Tag as TagIcon, 
  CheckCircle2, 
  File, 
  FileText, 
  Image as ImageIcon, 
  FileCode, 
  Archive 
} from 'lucide-react'
import { 
  getTaskDetails, 
  updateTask, 
  deleteTask, 
  addComment, 
  deleteComment,
  addChecklistItem, 
  toggleChecklistItem, 
  deleteChecklistItem,
  updateChecklistItem,
  getAllUsers,
  addAttachment,
  deleteAttachment,
  getTaskActivityLog,
  getBoardTags,
  addTagToTask,
  removeTagFromTask,
  logTime,
  getTimeEntries,
  submitForReview,
  completeReview
} from '@/lib/task-actions'
import { undoLastAction } from '@/lib/board-actions'
import { toast } from 'sonner'
import { useOfflineStore } from '@/lib/store/use-offline-store'
import { cn } from '@/lib/utils'
import { User, Task, Comment, ChecklistItem, Checklist, Priority, Tag, TimeEntry, Attachment, ActionResult } from '@/types/kanban'
import { ConflictDialog } from './conflict-dialog'

interface TaskDetailsDialogProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  boardMembers: User[]
  currentUser: User
}

export function TaskDetailsDialog({ taskId, isOpen, onClose, boardMembers, currentUser }: TaskDetailsDialogProps) {
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [, setUpdating] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [activityLog, setActivityLog] = useState<Array<{ id: string; user: { name: string | null; image: string | null }; action: string; createdAt: string | Date }>>([])
  const [activityFilter, setActivityFilter] = useState<string>('all')
  const [showActivity, setShowActivity] = useState(false)

  // New states for tags, time tracking, reviews
  const [boardTags, setBoardTags] = useState<Tag[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [isLoggingTime, setIsLoggingTime] = useState(false)
  const [timeDuration, setTimeDuration] = useState('')
  const [timeDescription, setTimeDescription] = useState('')
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)
  const [selectedReviewer, setSelectedReviewer] = useState('')
  const [reviewFeedback, setReviewFeedback] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [conflictModalOpen, setConflictModalOpen] = useState(false)
  const [conflictData, setConflictData] = useState<{ field: string, value: any } | null>(null)
  const { isOnline, addAction } = useOfflineStore()

  const isMember = currentUser.role === 'MEMBER'
  const isAdmin = currentUser.role === 'ADMIN'

  const eligibleAssignees = (() => {
    if (isMember) {
      return [currentUser]
    }
    if (isAdmin && allUsers.length > 0) {
      return allUsers
    }
    return boardMembers
  })()

  useEffect(() => {
    if (showActivity && taskId) {
      getTaskActivityLog({ id: taskId }).then((result: ActionResult) => {
        if (result.success && result.data) {
          setActivityLog(result.data as any)
        }
      }).catch((error: unknown) => {
        console.error('Failed to load activity log', error)
      })
    }
  }, [showActivity, taskId])

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, taskId])

  useEffect(() => {
    if (isOpen && isAdmin) {
      getAllUsers().then((result: ActionResult) => {
        if (result.success && result.data) {
          setAllUsers(result.data as User[])
        }
      }).catch((error: unknown) => {
        console.error(error)
      })
    }
  }, [isOpen, isAdmin])



  useEffect(() => {
    if (isOpen && task?.column?.boardId) {
      getBoardTags({ boardId: task.column.boardId }).then((result: ActionResult) => {
        if (result.success && result.data) {
          setBoardTags(result.data as Tag[])
        }
      }).catch(console.error)
    }
    if (isOpen && taskId) {
      getTimeEntries({ id: taskId }).then((result: ActionResult) => {
        if (result.success && result.data) {
          setTimeEntries(result.data as TimeEntry[])
        }
      }).catch(console.error)
    }
  }, [isOpen, taskId, task?.column?.boardId])

  const filteredActivityLog = activityFilter === 'all' 
    ? activityLog 
    : activityLog.filter(log => log.action === activityFilter)

  const fetchTaskDetails = async () => {
    setLoading(true)
    try {
      const result = await getTaskDetails({ id: taskId! })
      if (result.success && result.data) {
        setTask(result.data as Task)
      } else {
        toast.error(result.error || 'Failed to load task details')
        onClose()
      }
    } catch {
      toast.error('An unexpected error occurred')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (field: string, value: string | Priority | null) => {
    if (!task) return
    setUpdating(true)
    try {
      if (!isOnline) {
        await addAction({
          type: 'EDIT_TASK',
          payload: { id: taskId!, [field]: value, version: task.version }
        })
        setTask({ ...task, [field]: value } as Task)
        toast.success('Update queued (offline)')
        return
      }

      const result = await updateTask({ id: taskId!, [field]: value, version: task.version })
      if (result.success) {
        setTask({ ...task, [field]: value } as Task)
        toast.success('Task updated', {
          action: {
            label: 'Undo',
            onClick: async () => {
              const undoResult = await undoLastAction()
              if (undoResult.success) {
                toast.success('Action undone')
                fetchTaskDetails() // Refresh local state
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
    if (!conflictData || !task) return
    try {
      const result = await updateTask({ 
        id: taskId!, 
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
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      const result = await deleteTask({ id: taskId! })
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      if (!isOnline) {
        await addAction({
          type: 'ADD_COMMENT',
          payload: { taskId: taskId!, content: newComment }
        })
        if (task) {
          const tempComment: Comment = {
            id: crypto.randomUUID(),
            content: newComment,
            taskId: taskId!,
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

      const result = await addComment({ taskId: taskId!, content: newComment })
      if (result.success && result.data) {
        const comment = result.data as Comment
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
    } catch (_error: unknown) {
      const message = _error instanceof Error ? _error.message : 'An unexpected error occurred'
      toast.error(message)
    }
  }

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim() || !task) return
    try {
      const result = await addChecklistItem({ taskId: taskId!, content: newChecklistItem })
      
      if (result.success && result.data) {
        const item = result.data as ChecklistItem
        const updatedChecklists = [...(task.checklists || [])]
        if (updatedChecklists.length === 0) {
          // Create a mock checklist if it's the first item
          updatedChecklists.push({ 
            id: item.checklistId, 
            title: 'Task Checklist', 
            taskId: taskId!, 
            items: [item] 
          })
        } else {
          // Add to the first existing checklist
          const firstChecklist = { ...updatedChecklists[0] }
          firstChecklist.items = [...firstChecklist.items, item]
          updatedChecklists[0] = firstChecklist
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
    } catch (_error: unknown) {
       const message = _error instanceof Error ? _error.message : 'An unexpected error occurred'
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

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditingContent('')
  }

  const handleAddTag = async (tagId: string) => {
    try {
      const result = await addTagToTask({ taskId: taskId!, tagId })
      if (result.success && result.data) {
        setTask(result.data as Task)
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
    try {
      const result = await removeTagFromTask({ taskId: taskId!, tagId })
      if (result.success && result.data) {
        setTask(result.data as Task)
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

  const handleLogTime = async () => {
    const duration = parseInt(timeDuration)
    if (isNaN(duration) || duration <= 0) {
      toast.error('Invalid duration')
      return
    }
    try {
      const result = await logTime({ taskId: taskId!, duration, description: timeDescription })
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

  const handleSubmitReview = async () => {
    if (!selectedReviewer) {
      toast.error('Select a reviewer')
      return
    }
    try {
      const result = await submitForReview({ taskId: taskId!, reviewerId: selectedReviewer })
      if (result.success) {
        setIsSubmittingReview(false)
        fetchTaskDetails()
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
    if ((status === 'CHANGES_REQUESTED' || status === 'REJECTED') && !reviewFeedback) {
      toast.error('Feedback is required for changes or rejection')
      return
    }
    try {
      const activeReview = task?.reviews?.find(r => r.status === 'PENDING')
      if (!activeReview) return
      const result = await completeReview({ id: activeReview.id, status, feedback: reviewFeedback })
      if (result.success) {
        setReviewFeedback('')
        fetchTaskDetails()
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

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // In a real app, you'd upload to S3/Cloudinary here
      // For this demo, we'll simulate it with a data URL or just the file metadata
      const reader = new FileReader()
      reader.onloadend = async () => {
        const result = await addAttachment({
          taskId: taskId!,
          name: file.name,
          type: file.type,
          size: file.size,
          url: reader.result as string // Using base64 for demo purposes
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
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('An unexpected error occurred')
    } finally {
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

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="size-4 text-blue-500" />
    if (type.includes('pdf')) return <FileText className="size-4 text-red-500" />
    if (type.includes('zip') || type.includes('rar')) return <Archive className="size-4 text-orange-500" />
    if (type.includes('json') || type.includes('javascript') || type.includes('html')) return <FileCode className="size-4 text-purple-500" />
    return <File className="size-4 text-muted-foreground" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-primary/10 shadow-2xl shadow-primary/5 rounded-3xl">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : task ? (
          <>
            <DialogHeader className="p-6 border-b border-primary/5 bg-muted/20">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    {task.column?.name || 'No Column'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">ID: {task.id.slice(-6).toUpperCase()}</span>
                  <span className="text-xs text-muted-foreground">v{task.version}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || task?.creatorId === currentUser?.id || task?.assigneeId === currentUser?.id) && (
                    <Button variant="ghost" size="icon" className="size-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={handleDelete}>
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
              <DialogTitle className="mt-4">
                <Input
                  value={task.title}
                  onChange={(e) => setTask({ ...task, title: e.target.value })}
                  onBlur={(e) => handleUpdate('title', e.target.value)}
                  className="text-2xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 h-auto font-oswald uppercase tracking-tight"
                />
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto flex">
              {/* Main Content */}
              <div className="flex-[2] p-6 space-y-8 border-r border-primary/5">
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <MessageSquare className="size-4" />
                    Description
                  </div>
                  <Textarea
                    value={task.description || ''}
                    onChange={(e) => setTask({ ...task, description: e.target.value })}
                    onBlur={(e) => handleUpdate('description', e.target.value)}
                    placeholder="Add a detailed description..."
                    className="min-h-[150px] bg-muted/20 border-primary/5 focus:border-primary/20 resize-none"
                  />
                </section>

                {/* Reviews / Approval Section */}
                {task.reviews && task.reviews.length > 0 && (
                  <section className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <CheckCircle2 className="size-4 text-primary" />
                        Approval Workflow
                      </div>
                      <Badge variant={
                        task.reviews[0].status === 'APPROVED' ? 'default' :
                        task.reviews[0].status === 'PENDING' ? 'secondary' : 'destructive'
                      } className={cn(
                        task.reviews[0].status === 'APPROVED' && "bg-green-500 hover:bg-green-600",
                        task.reviews[0].status === 'CHANGES_REQUESTED' && "bg-orange-500 hover:bg-orange-600"
                      )}>
                        {task.reviews[0].status.replace('_', ' ')}
                      </Badge>
                    </div>
                    
                    {task.reviews[0].status === 'PENDING' && task.reviews[0].reviewerId === currentUser.id && (
                      <div className="space-y-3 p-3 bg-background/50 rounded-xl border border-primary/5">
                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Reviewer Feedback</Label>
                        <Textarea 
                          placeholder="Add feedback for the creator..." 
                          value={reviewFeedback}
                          onChange={(e) => setReviewFeedback(e.target.value)}
                          className="text-xs bg-background/50 min-h-[80px]"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleCompleteReview('APPROVED')} className="flex-1 bg-green-600 hover:bg-green-700 h-8 text-xs font-bold uppercase">Approve</Button>
                          <Button size="sm" variant="outline" onClick={() => handleCompleteReview('CHANGES_REQUESTED')} className="flex-1 text-orange-500 border-orange-500/20 hover:bg-orange-500/10 h-8 text-xs font-bold uppercase">Changes</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleCompleteReview('REJECTED')} className="flex-1 h-8 text-xs font-bold uppercase">Reject</Button>
                        </div>
                      </div>
                    )}

                    {task.reviews[0].feedback && (
                      <div className="text-xs p-3 bg-background/50 rounded-lg border border-primary/5 italic">
                        &quot;{task.reviews[0].feedback}&quot;
                        <div className="mt-2 text-[10px] text-muted-foreground not-italic font-medium">— {task.reviews[0].reviewer?.name || 'Reviewer'}</div>
                      </div>
                    )}
                  </section>
                )}

                {!task.reviews?.some(r => r.status === 'PENDING') && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <CheckCircle2 className="size-4" />
                        Task Review
                      </div>
                      {!isSubmittingReview ? (
                        <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold border-primary/10 hover:bg-primary/5" onClick={() => setIsSubmittingReview(true)}>
                          Submit for Review
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => setIsSubmittingReview(false)}>Cancel</Button>
                      )}
                    </div>

                    {isSubmittingReview && (
                      <div className="flex gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                        <Select value={selectedReviewer} onValueChange={setSelectedReviewer}>
                          <SelectTrigger className="h-8 text-xs bg-muted/20 border-primary/5 flex-1">
                            <SelectValue placeholder="Select Reviewer" />
                          </SelectTrigger>
                          <SelectContent>
                            {boardMembers.filter(m => m.id !== currentUser.id).map(member => (
                              <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                            ))}
                            {boardMembers.filter(m => m.id !== currentUser.id).length === 0 && (
                              <div className="p-2 text-[10px] text-muted-foreground text-center">No other members</div>
                            )}
                          </SelectContent>
                        </Select>
                        <Button size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={handleSubmitReview} disabled={!selectedReviewer}>Submit</Button>
                      </div>
                    )}
                  </section>
                )}

                <section className="space-y-4">
                  {(() => {
                    const allItems = task.checklists?.flatMap(cl => cl.items) || []
                    const completedCount = allItems.filter(i => i.isCompleted).length
                    const totalCount = allItems.length
                    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0
                    
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                            <CheckSquare className="size-4" />
                            Checklist
                            {totalCount > 0 && (
                              <span className="text-xs font-normal text-muted-foreground/60">
                                ({completedCount}/{totalCount} completed)
                              </span>
                            )}
                          </div>
                          {totalCount > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-green-500 transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-muted-foreground">{Math.round(progress)}%</span>
                            </div>
                          )}
                        </div>
                      </>
                    )
                  })()}
                  <div className="space-y-2">
                    {task.checklists?.[0]?.items.map((item: ChecklistItem) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-3 flex-1">
                          <input 
                            type="checkbox" 
                            checked={item.isCompleted} 
                            onChange={(e) => handleToggleChecklistItem(item.id, e.target.checked)}
                            className="rounded border-primary/20 cursor-pointer" 
                          />
                          {editingItemId === item.id ? (
                            <div className="flex-1 flex gap-2">
                              <Input 
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(item.id)}
                                className="h-7 text-sm"
                                autoFocus
                              />
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-green-500" onClick={() => handleSaveEdit(item.id)}>Save</Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCancelEdit}>Cancel</Button>
                            </div>
                          ) : (
                            <span 
                              className={cn("text-sm cursor-pointer hover:text-primary", item.isCompleted && "line-through text-muted-foreground")}
                              onClick={() => handleStartEdit(item.id, item.content)}
                            >
                              {item.content}
                            </span>
                          )}
                        </div>
                        {editingItemId !== item.id && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
                              onClick={() => handleStartEdit(item.id, item.content)}
                            >
                              <Edit2 className="size-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                              onClick={() => handleDeleteChecklistItem(item.id)}
                            >
                              <X className="size-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <Input 
                        placeholder="Add checklist item..." 
                        className="h-8 text-xs bg-muted/10 border-primary/5"
                        value={newChecklistItem}
                        onChange={(e) => setNewChecklistItem(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                      />
                      <Button size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={handleAddChecklistItem}>Add</Button>
                    </div>
                  </div>
                </section>

                {/* Time Tracking Section */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Clock className="size-4" />
                      Time Tracking
                      <span className="text-xs font-normal text-muted-foreground/60 ml-2">
                        Total: {Math.floor(timeEntries.reduce((acc, curr) => acc + curr.duration, 0) / 60)}h {timeEntries.reduce((acc, curr) => acc + curr.duration, 0) % 60}m
                      </span>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold gap-1 border-primary/10 hover:bg-primary/5" onClick={() => setIsLoggingTime(!isLoggingTime)}>
                      <Plus className="size-3" />
                      Log Time
                    </Button>
                  </div>

                  {isLoggingTime && (
                    <div className="p-4 bg-muted/20 rounded-xl border border-primary/5 space-y-3 animate-in fade-in zoom-in-95 duration-200 shadow-inner">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Minutes</Label>
                          <Input 
                            type="number" 
                            placeholder="60" 
                            value={timeDuration}
                            onChange={(e) => setTimeDuration(e.target.value)}
                            className="h-8 text-xs bg-background/50" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Description</Label>
                          <Input 
                            placeholder="What did you do?" 
                            value={timeDescription}
                            onChange={(e) => setTimeDescription(e.target.value)}
                            className="h-8 text-xs bg-background/50" 
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => setIsLoggingTime(false)}>Cancel</Button>
                        <Button size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={handleLogTime} disabled={!timeDuration}>Save Entry</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                    {timeEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/10 border border-primary/5 text-xs hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-primary/10">
                            <Clock className="size-3 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold">{entry.duration}m — {entry.description || 'Working on task'}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span className="font-medium text-foreground/70">{entry.user?.name || 'User'}</span>
                              <span className="size-0.5 rounded-full bg-muted-foreground/30" />
                              <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {timeEntries.length === 0 && !isLoggingTime && (
                      <div className="flex flex-col items-center justify-center py-8 opacity-40">
                        <Clock className="size-8 mb-2" />
                        <p className="text-xs italic">No time logs recorded yet</p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Paperclip className="size-4" />
                      Attachments
                      {task.attachments && task.attachments.length > 0 && (
                        <span className="text-xs font-normal text-muted-foreground/60 ml-1">
                          ({task.attachments.length})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {task.attachments?.map((attachment) => (
                      <div key={attachment.id} className="group relative flex items-center gap-3 p-3 rounded-xl bg-muted/10 border border-primary/5 hover:bg-muted/20 hover:border-primary/20 transition-all duration-200">
                        <div className="p-2.5 rounded-lg bg-background/50 shadow-sm">
                          {getFileIcon(attachment.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <a 
                            href={attachment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block text-xs font-semibold truncate hover:text-primary transition-colors"
                            title={attachment.name}
                          >
                            {attachment.name}
                          </a>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{formatFileSize(attachment.size)}</span>
                            <span>•</span>
                            <span>{new Date(attachment.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                          onClick={() => handleDeleteAttachment(attachment.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {(!task.attachments || task.attachments.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-6 bg-muted/5 rounded-xl border border-dashed border-primary/10 opacity-60">
                      <Paperclip className="size-6 mb-2 text-muted-foreground/40" />
                      <p className="text-[10px] italic">No files attached yet</p>
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <MessageSquare className="size-4" />
                    Comments
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <Avatar className="size-8">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <Textarea
                          placeholder="Write a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          className="min-h-[80px] bg-muted/20 border-primary/5"
                        />
                        <Button size="sm" className="gap-2" onClick={handleAddComment}>
                          <Send className="size-3" />
                          Comment
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-6 pt-4">
                      {(task.comments || []).map((comment: Comment) => {
                        const canDelete = 
                          currentUser.role === 'ADMIN' ||
                          (currentUser.role === 'MANAGER') ||
                          (comment.userId === currentUser.id && (Date.now() - new Date(comment.createdAt).getTime()) < 5 * 60 * 1000)
                        return (
                          <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Avatar className="size-8 ring-1 ring-primary/10">
                              <AvatarImage src={comment.user.image || undefined} />
                              <AvatarFallback>{(comment.user.name?.[0] || 'U') as string}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">{comment.user.name || 'Anonymous'}</span>
                                  <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                                </div>
                                {canDelete && (
                                  <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-red-500" onClick={() => handleDeleteComment(comment.id)}>
                                    <Trash2 className="size-3" />
                                  </Button>
                                )}
                              </div>
                              <div className="p-3 bg-muted/20 rounded-2xl rounded-tl-none border border-primary/5 text-sm">
                                {comment.content}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Clock className="size-4" />
                      Activity
                    </div>
                    {!showActivity && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => setShowActivity(true)}>
                        Show Activity
                      </Button>
                    )}
                  </div>
                  {showActivity && (
                    <>
                      <div className="flex gap-2 flex-wrap">
                        <Select value={activityFilter} onValueChange={setActivityFilter}>
                          <SelectTrigger className="h-7 text-xs bg-muted/20 border-primary/5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="CREATE_TASK">Created</SelectItem>
                            <SelectItem value="UPDATE_TASK_STATUS">Status Changed</SelectItem>
                            <SelectItem value="UPDATE_TASK">Updated</SelectItem>
                            <SelectItem value="ADD_COMMENT">Comment</SelectItem>
                            <SelectItem value="ADD_TAG_TO_TASK">Tag Added</SelectItem>
                            <SelectItem value="ADD_CHECKLIST_ITEM">Checklist</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {filteredActivityLog.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No activity yet</p>
                        ) : (
                          filteredActivityLog.map((log) => (
                        <div key={log.id} className="flex gap-3 text-xs">
                          <Avatar className="size-6">
                            <AvatarImage src={log.user?.image || undefined} />
                            <AvatarFallback className="text-[8px]">
                              {log.user?.name?.[0] || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{log.user?.name || 'Unknown'}</span>
                              <span className="text-muted-foreground">
                                {String(log.action).replace(/_/g, ' ').toLowerCase()}
                              </span>
                            </div>
                            <span className="text-muted-foreground">
                              {new Date(log.createdAt as string | number | Date).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </section>
              </div>

              {/* Sidebar */}
              <div className="flex-1 p-6 space-y-6 bg-muted/10">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Assignee</Label>
                    <Select value={task.assigneeId || 'unassigned'} onValueChange={(val) => handleUpdate('assigneeId', val === 'unassigned' ? null : val)}>
                      <SelectTrigger className="bg-background/50 border-primary/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {isMember ? (
                          <SelectItem value={currentUser.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-4">
                                <AvatarImage src={currentUser.image || undefined} />
                                <AvatarFallback>{(currentUser.name?.[0] || 'U') as string}</AvatarFallback>
                              </Avatar>
                              Assign to me
                            </div>
                          </SelectItem>
                        ) : (
                          eligibleAssignees.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              <div className="flex items-center gap-2">
                                <Avatar className="size-4">
                                  <AvatarImage src={member.image || undefined} />
                                  <AvatarFallback>{(member.name?.[0] || 'U') as string}</AvatarFallback>
                                </Avatar>
                                {member.name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Priority</Label>
                    <Select value={task.priority} onValueChange={(val) => handleUpdate('priority', val)}>
                      <SelectTrigger className="bg-background/50 border-primary/5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="URGENT">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Due Date</Label>
                    <Input 
                      type="date" 
                      value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
                      onChange={(e) => handleUpdate('dueDate', e.target.value ? e.target.value : null)}
                      className="bg-background/50 border-primary/5 h-9"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2">
                      <TagIcon className="size-3" />
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {task.tags?.map((tag) => (
                        <Badge 
                          key={tag.id} 
                          variant="secondary" 
                          className="text-[10px] px-2 py-0 h-5 flex items-center gap-1.5 border transition-all hover:brightness-110"
                          style={{ backgroundColor: `${tag.color}15`, color: tag.color, borderColor: `${tag.color}30` }}
                        >
                          {tag.name}
                          <button onClick={() => handleRemoveTag(tag.id)} className="hover:text-foreground opacity-60 hover:opacity-100 transition-opacity">
                            <X className="size-2.5" />
                          </button>
                        </Badge>
                      ))}
                      {(!task.tags || task.tags.length === 0) && (
                        <span className="text-[10px] text-muted-foreground italic">No tags</span>
                      )}
                    </div>
                    <Select onValueChange={handleAddTag}>
                      <SelectTrigger className="bg-background/50 border-primary/5 h-8 text-[10px] mt-1 hover:bg-primary/5 transition-colors">
                        <SelectValue placeholder="Add Tag..." />
                      </SelectTrigger>
                      <SelectContent>
                        {boardTags
                          .filter(tag => !task.tags?.some(t => t.id === tag.id))
                          .map((tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div className="size-2 rounded-full shadow-sm" style={{ backgroundColor: tag.color }} />
                                {tag.name}
                              </div>
                            </SelectItem>
                          ))}
                        {boardTags.filter(tag => !task.tags?.some(t => t.id === tag.id)).length === 0 && (
                          <div className="p-2 text-[10px] text-muted-foreground text-center">No more tags</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-6 border-t border-primary/5 space-y-4 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Created by</span>
                    <span className="font-medium text-foreground">{task.creator?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Created on</span>
                    <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last updated</span>
                    <span>{new Date(task.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="pt-6 border-t border-primary/5">
                  <div className="relative">
                    <input 
                      type="file" 
                      id="attachment-upload" 
                      className="hidden" 
                      onChange={handleUpload}
                      disabled={isUploading}
                    />
                    <Button 
                      variant="outline" 
                      className="w-full gap-2 text-xs h-9 border-primary/20 hover:bg-primary/5"
                      disabled={isUploading}
                      onClick={() => document.getElementById('attachment-upload')?.click()}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Paperclip className="size-3.5" />
                          Attach File
                        </>
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                    Supported: Images, PDF, Docs (Max 10MB)
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">Task not found</p>
            <Button onClick={onClose}>Close</Button>
          </div>
        )}
      </DialogContent>

      <ConflictDialog 
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        onRefresh={() => {
          setConflictModalOpen(false)
          fetchTaskDetails()
        }}
        onResolve={handleResolveConflict}
      />
    </Dialog>
  )
}
