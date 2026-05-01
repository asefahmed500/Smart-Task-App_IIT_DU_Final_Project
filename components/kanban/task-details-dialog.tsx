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
  Loader2
} from 'lucide-react'
import { 
  getTaskDetails, 
  updateTask, 
  deleteTask, 
  addComment, 
  addChecklistItem, 
  toggleChecklistItem, 
  deleteChecklistItem 
} from '@/lib/task-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TaskDetailsDialogProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  boardMembers: any[]
  currentUser: any
}

export function TaskDetailsDialog({ taskId, isOpen, onClose, boardMembers, currentUser }: TaskDetailsDialogProps) {
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newChecklistItem, setNewChecklistItem] = useState('')

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTaskDetails()
    }
  }, [isOpen, taskId])

  const fetchTaskDetails = async () => {
    setLoading(true)
    try {
      const data = await getTaskDetails(taskId!)
      setTask(data)
    } catch (error: any) {
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
      setTask({ ...task, [field]: value })
      toast.success('Task updated')
    } catch (error: any) {
      toast.error('Failed to update task')
    } finally {
      setUpdating(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return
    try {
      const comment = await addComment(taskId!, newComment)
      setTask({ ...task, comments: [comment, ...task.comments] })
      setNewComment('')
      toast.success('Comment added')
    } catch (error: any) {
      toast.error('Failed to add comment')
    }
  }

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return
    try {
      const item = await addChecklistItem(taskId!, newChecklistItem)
      const updatedChecklists = [...(task.checklists || [])]
      if (updatedChecklists.length === 0) {
        updatedChecklists.push({ items: [item] })
      } else {
        updatedChecklists[0].items.push(item)
      }
      setTask({ ...task, checklists: updatedChecklists })
      setNewChecklistItem('')
      toast.success('Item added')
    } catch (error: any) {
      toast.error('Failed to add checklist item')
    }
  }

  const handleToggleChecklistItem = async (itemId: string, isCompleted: boolean) => {
    try {
      await toggleChecklistItem(itemId, isCompleted)
      const updatedChecklists = task.checklists.map((cl: any) => ({
        ...cl,
        items: cl.items.map((item: any) => 
          item.id === itemId ? { ...item, isCompleted } : item
        )
      }))
      setTask({ ...task, checklists: updatedChecklists })
    } catch (error: any) {
      toast.error('Failed to update item')
    }
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    try {
      await deleteChecklistItem(itemId)
      const updatedChecklists = task.checklists.map((cl: any) => ({
        ...cl,
        items: cl.items.filter((item: any) => item.id !== itemId)
      }))
      setTask({ ...task, checklists: updatedChecklists })
      toast.success('Item removed')
    } catch (error: any) {
      toast.error('Failed to delete item')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return
    try {
      await deleteTask(taskId!)
      toast.success('Task deleted')
      onClose()
    } catch (error: any) {
      toast.error('Failed to delete task')
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-primary/10">
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
                    {task.column.name}
                  </Badge>
                  <span className="text-xs text-muted-foreground">ID: {task.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-2">
                  {currentUser?.role !== 'MEMBER' && (
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <CheckSquare className="size-4" />
                      Checklist
                    </div>
                  </div>
                  <div className="space-y-2">
                    {task.checklists?.[0]?.items.map((item: any) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors group">
                        <div className="flex items-center gap-3 flex-1">
                          <input 
                            type="checkbox" 
                            checked={item.isCompleted} 
                            onChange={(e) => handleToggleChecklistItem(item.id, e.target.checked)}
                            className="rounded border-primary/20 cursor-pointer" 
                          />
                          <span className={cn("text-sm", item.isCompleted && "line-through text-muted-foreground")}>{item.content}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="size-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                          onClick={() => handleDeleteChecklistItem(item.id)}
                        >
                          <X className="size-3" />
                        </Button>
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
                      {task.comments.map((comment: any) => (
                        <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          <Avatar className="size-8 ring-1 ring-primary/10">
                            <AvatarImage src={comment.user.image} />
                            <AvatarFallback>{comment.user.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{comment.user.name}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-muted/20 rounded-2xl rounded-tl-none border border-primary/5 text-sm">
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
                        {boardMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            <div className="flex items-center gap-2">
                              <Avatar className="size-4">
                                <AvatarImage src={member.image} />
                                <AvatarFallback>{member.name?.[0] || 'U'}</AvatarFallback>
                              </Avatar>
                              {member.name}
                            </div>
                          </SelectItem>
                        ))}
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
                    <span className="font-medium text-foreground">{task.creator.name}</span>
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
