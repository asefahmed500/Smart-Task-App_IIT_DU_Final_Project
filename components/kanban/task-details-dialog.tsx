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
  Clock,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { useOfflineStore } from '@/lib/store/use-offline-store'
import { getSocket } from '@/components/kanban/socket-hooks'
import { cn } from '@/utils/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConflictDialog } from './conflict-dialog'
import { Separator } from '@/components/ui/separator'
import {
  User,
  Task,
  Tag,
  Priority
} from '@/types/kanban'

// Import custom hooks
import { useTaskDetails } from '@/hooks/use-task/use-task-details'
import { useTaskComments } from '@/hooks/use-task/use-task-comments'
import { useTaskChecklist } from '@/hooks/use-task/use-task-checklist'
import { useTaskTags } from '@/hooks/use-task/use-task-tags'
import { useTaskAttachments } from '@/hooks/use-task/use-task-attachments'
import { useTaskActivity } from '@/hooks/use-task/use-task-activity'
import { useTaskTime } from '@/hooks/use-task/use-task-time'
import { useTaskReviews } from '@/hooks/use-task/use-task-reviews'

// Import modular components
import { TaskHeader } from './task-details/task-header'
import { TaskDescription } from './task-details/task-description'
import { TaskReviewsSection } from './task-details/task-reviews-section'
import { TaskChecklistSection } from './task-details/task-checklist-section'
import { TaskAttachmentsSection } from './task-details/task-attachments-section'
import { TaskActivityTab } from './task-details/task-activity-tab'
import { TaskCommentsSection } from './task-details/task-comments-section'
import { TaskTimeTab } from './task-details/task-time-tab'
import { TaskSidebar } from './task-details/task-sidebar'

interface TaskDetailsDialogProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  boardMembers: User[]
  currentUser: User
  editingTasks?: Record<string, { id: string; name: string; image: string | null }[]>
  boardId?: string
}

export function TaskDetailsDialog({ taskId, isOpen, onClose, boardMembers, currentUser, editingTasks, boardId }: TaskDetailsDialogProps) {
  const isMember = currentUser.role === 'MEMBER'
  const isAdmin = currentUser.role === 'ADMIN'

  // Initialize hooks
  const {
    task,
    setTask,
    loading,
    updating,
    allUsers,
    conflictModalOpen,
    setConflictModalOpen,
    handleUpdate,
    handleDelete,
    handleResolveConflict,
    fetchTaskDetails
  } = useTaskDetails({ taskId, isOpen, onClose, currentUser, isAdmin })

  const {
    newComment,
    setNewComment,
    handleAddComment,
    handleDeleteComment,
    handleEditComment,
    handleToggleReaction,
    isCommentEditable,
  } = useTaskComments({ taskId, task, setTask, currentUser, fetchTaskDetails })

  const {
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
  } = useTaskChecklist({ taskId, task, setTask, fetchTaskDetails })

  const {
    boardTags,
    handleAddTag,
    handleRemoveTag
  } = useTaskTags({ taskId, task, setTask, fetchTaskDetails })

  const {
    isUploading,
    handleUpload,
    handleDeleteAttachment
  } = useTaskAttachments({ taskId, task, setTask, fetchTaskDetails })

  const {
    activityLog,
    filteredActivityLog,
    activityFilter,
    setActivityFilter,
    isLoading: activityLoading
  } = useTaskActivity({ taskId, isOpen, boardId })

  const {
    timeEntries,
    isLoggingTime,
    setIsLoggingTime,
    timeDuration,
    setTimeDuration,
    timeDescription,
    setTimeDescription,
    handleLogTime,
    editingEntryId,
    editDuration,
    setEditDuration,
    editDescription,
    setEditDescription,
    startEdit,
    cancelEdit,
    handleUpdateTimeEntry,
    handleDeleteTimeEntry
  } = useTaskTime({ taskId, isOpen, fetchTaskDetails })

  const {
    selectedReviewer,
    setSelectedReviewer,
    reviewFeedback,
    setReviewFeedback,
    isSubmittingReview,
    setIsSubmittingReview,
    handleSubmitReview,
    handleCompleteReview
  } = useTaskReviews({ taskId, task, setTask, currentUser, fetchTaskDetails })

  const [showActivity, setShowActivity] = useState(false)
  const { isOnline } = useOfflineStore()

  // Emit editing events
  useEffect(() => {
    const socket = getSocket()
    if (!socket.connected || !boardId || !taskId) return

    if (isOpen) {
      socket.emit('task:editing', {
        boardId,
        taskId,
        user: {
          id: currentUser.id,
          name: currentUser.name || currentUser.email,
          image: currentUser.image,
        },
      })
    }

    return () => {
      if (isOpen) {
        socket.emit('task:stop-editing', {
          boardId,
          taskId,
          userId: currentUser.id,
        })
      }
    }
  }, [isOpen, taskId, boardId, currentUser])

  const eligibleAssignees = (() => {
    if (isMember) {
      return [currentUser]
    }
    if (isAdmin && allUsers.length > 0) {
      return allUsers
    }
    return boardMembers
  })()


  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-primary/10 shadow-2xl shadow-primary/5 rounded-3xl">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <DialogHeader className="sr-only">
              <DialogTitle>Loading Task Details</DialogTitle>
            </DialogHeader>
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground animate-pulse">Fetching task information...</p>
          </div>
        ) : task ? (
          <>
            <TaskHeader
              task={task}
              currentUser={currentUser}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              setTask={setTask}
              editingBy={taskId ? editingTasks?.[taskId]?.filter((u) => u.id !== currentUser.id) : undefined}
            />

            <div className="flex-1 flex overflow-hidden">
              <Tabs defaultValue="details" className="flex-1 flex flex-col">
                <div className="px-6 border-b border-primary/5 bg-muted/10">
                  <TabsList className="h-12 bg-transparent gap-6">
                    <TabsTrigger value="details" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-xs font-bold uppercase tracking-wider">
                      Details
                    </TabsTrigger>
                    <TabsTrigger value="activity" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-xs font-bold uppercase tracking-wider">
                      Activity & Comments
                      {((task.comments?.length || 0) > 0) && (
                        <Badge variant="secondary" className="ml-2 h-4 px-1 min-w-[16px] text-[10px]">
                          {task.comments?.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="time" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 text-xs font-bold uppercase tracking-wider">
                      Time Tracking
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 flex overflow-hidden">
                  <div className="flex-[3] overflow-y-auto">
                    <TabsContent value="details" className="p-6 m-0 space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                      <TaskDescription 
                        task={task} 
                        setTask={setTask} 
                        onUpdate={handleUpdate} 
                      />

                      <TaskReviewsSection 
                        task={task}
                        currentUser={currentUser}
                        allUsers={allUsers}
                        isSubmittingReview={isSubmittingReview}
                        setIsSubmittingReview={setIsSubmittingReview}
                        selectedReviewer={selectedReviewer}
                        setSelectedReviewer={setSelectedReviewer}
                        reviewFeedback={reviewFeedback}
                        setReviewFeedback={setReviewFeedback}
                        onSubmitReview={handleSubmitReview}
                        onCompleteReview={handleCompleteReview}
                      />

                      <TaskChecklistSection 
                        checklists={task.checklists || []}
                        onAddItem={handleAddChecklistItem}
                        onToggleItem={handleToggleChecklistItem}
                        onDeleteItem={handleDeleteChecklistItem}
                        onUpdateItem={handleSaveEdit}
                        onAddChecklist={handleAddChecklist}
                        onDeleteChecklist={handleDeleteChecklist}
                        newChecklistItem={newChecklistItem}
                        setNewChecklistItem={setNewChecklistItem}
                        editingItemId={editingItemId}
                        editingContent={editingContent}
                        setEditingContent={setEditingContent}
                        onStartEdit={handleStartEdit}
                        onCancelEdit={() => setEditingItemId(null)}
                      />

                      <TaskAttachmentsSection 
                        attachments={task.attachments || []}
                        onUpload={handleUpload}
                        onDeleteAttachment={handleDeleteAttachment}
                        isUploading={isUploading}
                      />
                    </TabsContent>

                    <TabsContent value="activity" className="p-6 m-0 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                      <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
                        <TaskActivityTab 
                          activityLog={activityLog} 
                          filteredActivityLog={filteredActivityLog}
                          activityFilter={activityFilter}
                          setActivityFilter={setActivityFilter}
                          isLoading={activityLoading}
                        />

                        <Separator className="bg-primary/5" />

                        <TaskCommentsSection
                          comments={task.comments || []}
                          onAddComment={handleAddComment}
                          onDeleteComment={handleDeleteComment}
                          onEditComment={handleEditComment}
                          onToggleReaction={handleToggleReaction}
                          isCommentEditable={isCommentEditable}
                          newComment={newComment}
                          setNewComment={setNewComment}
                          currentUser={currentUser}
                          boardMembers={boardMembers}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="time" className="p-6 m-0 space-y-8 animate-in fade-in zoom-in-95 duration-300">
                      <TaskTimeTab
                        timeEntries={timeEntries}
                        isLoggingTime={isLoggingTime}
                        setIsLoggingTime={setIsLoggingTime}
                        timeDuration={timeDuration}
                        setTimeDuration={setTimeDuration}
                        timeDescription={timeDescription}
                        setTimeDescription={setTimeDescription}
                        onLogTime={handleLogTime}
                        isLoading={loading}
                        currentUserId={currentUser.id}
                        currentUserRole={currentUser.role}
                        editingEntryId={editingEntryId}
                        editDuration={editDuration}
                        setEditDuration={setEditDuration}
                        editDescription={editDescription}
                        setEditDescription={setEditDescription}
                        onStartEdit={startEdit}
                        onCancelEdit={cancelEdit}
                        onUpdateEntry={handleUpdateTimeEntry}
                        onDeleteEntry={handleDeleteTimeEntry}
                      />
                    </TabsContent>
                  </div>

                  {/* Sidebar (Inside scrollable content) */}
                  <div className="flex-1 border-l border-primary/5 bg-muted/5 p-6 space-y-8 overflow-y-auto">
                    <TaskSidebar 
                      task={task}
                      currentUser={currentUser}
                      eligibleAssignees={eligibleAssignees}
                      boardTags={boardTags}
                      onUpdate={handleUpdate}
                      onAddTag={handleAddTag}
                      onRemoveTag={handleRemoveTag}
                    />
                  </div>
                </div>
              </Tabs>
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

