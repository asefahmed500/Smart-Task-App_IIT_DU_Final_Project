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
  Calendar, 
  MessageSquare, 
  Paperclip, 
  CheckSquare, 
  Clock, 
  User as UserIcon,
  Trash2,
  X,
  Send,
  Loader2,
  Edit2
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
  getTaskActivityLog
} from '@/lib/task-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { User, Task, Comment, ChecklistItem } from '@/types/kanban'

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
  const [updating, setUpdating] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [activityFilter, setActivityFilter] = useState<string>('all')
  const [showActivity, setShowActivity] = useState(false)

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
    if (isOpen && isAdmin) {
      getAllUsers().then(setAllUsers).catch(console.error)
    }
  }, [isOpen, isAdmin])

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails()
    }
  }, [isOpen, taskId])

  useEffect(() => {
    if (showActivity && taskId) {
      getTaskActivityLog(taskId).then(setActivityLog).catch(console.error)
    }
  }, [showActivity, taskId])

  const filteredActivityLog = activityFilter === 'all' 
    ? activityLog 
    : activityLog.filter(log => log.action === activityFilter)

  const fetchTaskDetails = async () => {
    setLoading(true)
    try {
      const data = await getTaskDetails(taskId!)
      setTask(data)
    } catch (error) {
      toast.error('Failed to load task details')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (field: string, value: any) => {
    setUpdating(true)
    try {
      await updateTask(taskId!, { [field]: value })
      if (task) {
        setTask({ ...task, [field]: value })
      }
      toast.success('Task updated')
    } catch (error) {
      toast.error('Failed to update task')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      const comment = await addComment(taskId!, newComment)
      if (task) {
        setTask({ ...task, comments: [comment, ...(task.comments || [])] })
      }
      setNewComment('')
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return
    try {
      await deleteComment(commentId, taskId!)
      if (task) {
        setTask({ ...task, comments: (task.comments || []).filter(c => c.id !== commentId) })
      }
      toast.success('Comment deleted')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete comment')
    }
  }

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim() || !task) return
    try {
      const item = await addChecklistItem(taskId!, newChecklistItem)
      
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
      toast.success('Item added')
    } catch (error) {
      toast.error('Failed to add checklist item')
    }
  }

  const handleToggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    try {
      await toggleChecklistItem(itemId, isCompleted)
      if (task) {
        const updatedChecklists = (task.checklists || []).map((cl) => ({
          ...cl,
          items: cl.items.map((item: ChecklistItem) => 
            item.id === itemId ? { ...item, isCompleted } : item
          )
        }))
        setTask({ ...task, checklists: updatedChecklists })
      }
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      await deleteChecklistItem(itemId)
      if (task) {
        const updatedChecklists = (task.checklists || []).map((cl) => ({
          ...cl,
          items: cl.items.filter((item: ChecklistItem) => item.id !== itemId)
        }))
        setTask({ ...task, checklists: updatedChecklists })
      }
      toast.success('Item removed')
    } catch (error) {
      toast.error('Failed to delete item')
    }
  }

  const handleStartEdit = (itemId: string, content: string) => {
    setEditingItemId(itemId)
    setEditingContent(content)
  }

  const handleSaveEdit = async (itemId: string) => {
    if (!editingContent.trim()) return
    try {
      await updateChecklistItem(itemId, editingContent)
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
      toast.success('Item updated')
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  const handleCancelEdit = () => {
    setEditingItemId(null)
    setEditingContent('')
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask(taskId!)
      toast.success('Task deleted')
      onClose()
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1100px] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-primary/10 shadow-2xl shadow-primary/5 rounded-3xl">
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
                                    {log.action.replace(/_/g, ' ').toLowerCase()}
                                  </span>
                                </div>
                                <span className="text-muted-foreground">
                                  {new Date(log.createdAt).toLocaleString()}
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
                      onChange={(e) => handleUpdate('dueDate', e.target.value ? new Date(e.target.value) : null)}
                      className="bg-background/50 border-primary/5 h-9"
                    />
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
                  <Button variant="outline" className="w-full gap-2 text-xs h-9" disabled>
                    <Paperclip className="size-3.5" />
                    Attach File
                  </Button>
                  <p className="text-[10px] text-muted-foreground text-center mt-2">File uploads coming soon</p>
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
    </Dialog>
  )
}
