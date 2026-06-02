'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  MessageSquare,
  Clock,
  Loader2,
  Link as LinkIcon,
  Plus,
  X,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { useOfflineStore } from '@/lib/store/use-offline-store'
import { getSocket } from '@/components/kanban/socket-hooks'
import { cn } from '@/utils/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConflictDialog } from './conflict-dialog'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { createIssueLink, deleteIssueLink, getTaskIssueLinks, searchBoardTasks } from '@/actions/issue-link-actions'
import {
  User,
  Task,
  Tag,
  Priority,
  Epic,
  IssueLink,
  IssueLinkType,
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
  boardEpics?: Epic[]
}

export function TaskDetailsDialog({ taskId, isOpen, onClose, boardMembers, currentUser, editingTasks, boardId, boardEpics = [] }: TaskDetailsDialogProps) {
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
    getNewItemInput,
    setNewItemInput,
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

  // Fetch issue links when task opens
  useEffect(() => {
    if (taskId && isOpen) {
      getTaskIssueLinks({ taskId }).then((result) => {
        if (result.success && result.data) {
          setIssueLinks(result.data as IssueLink[])
        }
      })
    }
  }, [taskId, isOpen])

  // Search tasks for linking
  const handleSearchTasks = async (query: string) => {
    setSearchQuery(query)
    if (!query || query.length < 2) {
      setSearchResults([])
      return
    }
    if (!boardId) return
    try {
      const result = await searchBoardTasks({
        boardId,
        query,
        excludeTaskId: taskId || undefined,
      })
      if (result.success && result.data) {
        setSearchResults(result.data as any[])
      }
    } catch {
      // Ignore search errors
    }
  }

  const handleAddIssueLink = async (targetTaskId: string) => {
    if (!taskId) return
    setIsLinking(true)
    try {
      const result = await createIssueLink({
        sourceTaskId: taskId,
        targetTaskId,
        linkType: selectedLinkType,
      })
      if (result.success) {
        toast.success('Issue link added')
        // Refresh links
        const linksResult = await getTaskIssueLinks({ taskId })
        if (linksResult.success && linksResult.data) {
          setIssueLinks(linksResult.data as IssueLink[])
        }
        setLinkDialogOpen(false)
        setSearchQuery('')
        setSearchResults([])
      } else {
        toast.error(result.error || 'Failed to add link')
      }
    } catch {
      toast.error('Failed to add link')
    } finally {
      setIsLinking(false)
    }
  }

  const handleDeleteIssueLink = async (linkId: string) => {
    try {
      const result = await deleteIssueLink({ id: linkId })
      if (result.success) {
        toast.success('Issue link removed')
        setIssueLinks((prev) => prev.filter((l) => l.id !== linkId))
      } else {
        toast.error(result.error || 'Failed to remove link')
      }
    } catch {
      toast.error('Failed to remove link')
    }
  }

  const getLinkLabel = (link: IssueLink) => {
    const isSource = link.sourceTaskId === taskId
    const otherTask = isSource ? link.targetTask : link.sourceTask
    const linkTypeLabel = link.linkType.replace('_', ' ')
    return { otherTask, linkTypeLabel, isSource }
  }

  const [showActivity, setShowActivity] = useState(false)
  const { isOnline } = useOfflineStore()

  // Issue links state
  const [issueLinks, setIssueLinks] = useState<IssueLink[]>([])
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [selectedLinkType, setSelectedLinkType] = useState<IssueLinkType>('BLOCKS')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isLinking, setIsLinking] = useState(false)

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

  const eligibleReviewers = (() => {
    if (isMember) {
      return boardMembers.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN')
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
            <DialogDescription className="sr-only">View and edit task details</DialogDescription>
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
              boardEpics={boardEpics}
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
                        allUsers={eligibleReviewers}
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
                        getNewItemInput={getNewItemInput}
                        setNewItemInput={setNewItemInput}
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

                      {/* Issue Links Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-semibold flex items-center gap-2">
                            <LinkIcon className="size-4 text-muted-foreground" />
                            Issue Links
                          </h3>
                          <Popover open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                            <PopoverTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                                <Plus className="size-3" />
                                Add Link
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="start">
                              <div className="p-3 border-b">
                                <div className="flex items-center gap-2">
                                  <Select value={selectedLinkType} onValueChange={(v) => setSelectedLinkType(v as IssueLinkType)}>
                                    <SelectTrigger className="h-8 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="BLOCKS">BLOCKS</SelectItem>
                                      <SelectItem value="BLOCKED_BY">BLOCKED BY</SelectItem>
                                      <SelectItem value="RELATES_TO">RELATES TO</SelectItem>
                                      <SelectItem value="DUPLICATES">DUPLICATES</SelectItem>
                                      <SelectItem value="DUPLICATED_BY">DUPLICATED BY</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="p-3">
                                <div className="relative">
                                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                                  <Input
                                    placeholder="Search tasks..."
                                    value={searchQuery}
                                    onChange={(e) => handleSearchTasks(e.target.value)}
                                    className="pl-7 h-8 text-xs"
                                  />
                                </div>
                                {searchResults.length > 0 && (
                                  <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                                    {searchResults.map((task) => (
                                      <button
                                        key={task.id}
                                        onClick={() => handleAddIssueLink(task.id)}
                                        disabled={isLinking}
                                        className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left text-sm disabled:opacity-50"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-medium truncate block">{task.title}</span>
                                          {task.column && (
                                            <span className="text-[10px] text-muted-foreground">{task.column.name}</span>
                                          )}
                                        </div>
                                        {task.issueType && (
                                          <Badge variant="outline" className="text-[8px] h-4 px-1 shrink-0">
                                            {task.issueType}
                                          </Badge>
                                        )}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {issueLinks.length > 0 ? (
                          <div className="space-y-2">
                            {issueLinks.map((link) => {
                              const { otherTask, linkTypeLabel, isSource } = getLinkLabel(link)
                              if (!otherTask) return null
                              return (
                                <div
                                  key={link.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-primary/5 group hover:bg-muted/50 transition-colors"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Badge variant="outline" className="text-[9px] h-5 px-1.5 shrink-0">
                                      {linkTypeLabel}
                                    </Badge>
                                    <span className="text-xs truncate" title={otherTask.title}>
                                      {otherTask.title}
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteIssueLink(link.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No issue links yet
                          </p>
                        )}
                      </div>
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
                      boardEpics={boardEpics}
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

