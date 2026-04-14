'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { useGetTaskQuery, useGetTaskAuditQuery, useUpdateTaskMutation, useGetTaskCommentsQuery, useAddCommentMutation, useDeleteCommentMutation, useUpdateCommentMutation, useAddTaskDependencyMutation, useRemoveTaskDependencyMutation, useDeleteTaskMutation, useAddAttachmentMutation, useDeleteAttachmentMutation } from '@/lib/slices/tasksApi'
import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { X, Save, MessageSquare, Link2, Activity, Clock, UserIcon, Tag, AlertCircle, CheckCircle2, Trash2, Paperclip, Download, FileText, Copy, Edit, Plus } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { setSelectedTask, setRightSidebarOpen } from '@/lib/slices/uiSlice'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import DependencySelectDialog from './dependency-select'

interface TaskDetailSidebarProps {
  taskId: string
}

const priorityColors: Record<string, string> = {
  LOW: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  MEDIUM: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  HIGH: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  CRITICAL: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const priorityOrder: Record<string, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
}

export default function TaskDetailSidebar({ taskId }: TaskDetailSidebarProps) {
  const dispatch = useAppDispatch()
  const rightSidebarTab = useAppSelector((s) => s.ui.rightSidebarTab)
  const { data: task, isLoading } = useGetTaskQuery(taskId)
  const { data: auditLog } = useGetTaskAuditQuery(taskId)
  const [updateTask] = useUpdateTaskMutation()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')

  const { data: comments, isLoading: commentsLoading } = useGetTaskCommentsQuery(taskId)
  const [addComment] = useAddCommentMutation()
  const [deleteComment] = useDeleteCommentMutation()
  const [newComment, setNewComment] = useState('')
  
  const [addDependency] = useAddTaskDependencyMutation()
  const [removeDependency] = useRemoveTaskDependencyMutation()
  const { data: boards } = useGetBoardsQuery()
  const { data: session } = useGetSessionQuery()
  const [isDepDialogOpen, setIsDepDialogOpen] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [updateComment] = useUpdateCommentMutation()
  const [deleteTask] = useDeleteTaskMutation()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [addAttachment] = useAddAttachmentMutation()
  const [deleteAttachment] = useDeleteAttachmentMutation()
  const [isUploading, setIsUploading] = useState(false)
  
  const isManager = session?.role === 'MANAGER' || session?.role === 'ADMIN'

  // Find available tasks across board for deps
  const activeBoard = boards?.find(b => b.id === task?.boardId)
  const availableTasks = activeBoard?.tasks || []

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground animate-pulse">Loading task details...</p>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium">Task not found</p>
        <Button variant="outline" size="sm" onClick={() => { dispatch(setSelectedTask(null)); dispatch(setRightSidebarOpen(false)) }}>
          Close Sidebar
        </Button>
      </div>
    )
  }

  const handleSave = async () => {
    await updateTask({ id: taskId, data: { title: editedTitle, description: editedDescription } })
    setIsEditing(false)
  }

  const handleStartEdit = () => {
    setEditedTitle(task.title)
    setEditedDescription(task.description || '')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleDeleteTask = async () => {
    try {
      await deleteTask(taskId).unwrap()
      toast.success('Task deleted')
      dispatch(setSelectedTask(null))
      dispatch(setRightSidebarOpen(false))
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to delete task')
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="p-4 pb-0">
        <Tabs defaultValue={rightSidebarTab} className="w-full flex-1 flex flex-col">
          <TabsList className="flex w-[calc(100%-1rem)] mx-auto h-auto p-1 mb-6 bg-[#f8f9fa] rounded-[16px] border border-[rgba(0,0,0,0.05)] shadow-sm">
            <TabsTrigger 
              value="overview" 
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-[12px] py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200" 
              onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'overview' })}
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="comments" 
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-[12px] py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200" 
              onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'comments' })}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Comments</span>
            </TabsTrigger>
            <TabsTrigger 
              value="dependencies" 
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-[12px] py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200" 
              onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'dependencies' })}
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Deps</span>
            </TabsTrigger>
            <TabsTrigger 
              value="attachments" 
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-[12px] py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200" 
              onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'attachments' })}
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Files</span>
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-[12px] py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200" 
              onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'activity' })}
            >
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Activity</span>
            </TabsTrigger>
          </TabsList>

            <TabsContent value="overview" className="mt-0 outline-none flex-1 overflow-hidden">
               <ScrollArea className="h-[calc(100vh-140px)] px-4 pb-8">
                  <div className="space-y-6 animate-in fade-in duration-500">
              {isEditing ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Title</Label>
                    <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="rounded-[8px] border-slate-200 focus:ring-primary/20" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-slate-700">Description</Label>
                    <Textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="rounded-[8px] border-slate-200 focus:ring-primary/20" rows={6} placeholder="Add a detailed description..." />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSave} size="sm" className="rounded-full px-4">
                      <Save className="h-3.5 w-3.5 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancel} size="sm" className="rounded-full px-4">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 pr-4">
                      <h3 className="text-xl font-bold tracking-tight text-slate-900">{task.title}</h3>
                      {task.description ? (
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No description provided.</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="outline" size="icon" className="h-9 w-9 rounded-full shadow-sm" onClick={handleStartEdit}>
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {isManager && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  <Separator className="bg-[rgba(0,0,0,0.05)]" />

                  <div className="space-y-2">
                    <Label className="text-caption text-[#777169]">Priority</Label>
                    <Badge className={priorityColors[task.priority] || ''}>{task.priority}</Badge>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-caption text-[#777169]">Status</Label>
                    <span className="text-body-standard text-black">{task.column?.name || 'None'}</span>
                  </div>

                  {task.assignee && (
                    <div className="space-y-2">
                      <Label className="text-caption text-[#777169]">Assignee</Label>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={task.assignee.avatar || undefined} />
                          <AvatarFallback>{task.assignee.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <span className="text-body-standard">{task.assignee.name}</span>
                      </div>
                    </div>
                  )}

                  {task.dueDate && (
                    <div className="space-y-2">
                      <Label className="text-caption text-[#777169]">Due Date</Label>
                      <span className="text-body-standard flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}

                  {task.labels && task.labels.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-caption text-[#777169]">Labels</Label>
                      <div className="flex flex-wrap gap-1">
                        {task.labels.map((label) => (
                          <Badge key={label} variant="outline" className="rounded-[4px] text-caption">
                            <Tag className="h-3 w-3 mr-1" />
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {task.isBlocked && (
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-[8px]">
                      <AlertCircle className="h-4 w-4 text-red-500" />
                      <span className="text-small text-red-600">This task is blocked</span>
                    </div>
                  )}

                  <Separator className="bg-[rgba(0,0,0,0.05)]" />
                  
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                         <Label className="text-micro text-[#777169] uppercase tracking-wider">Task ID</Label>
                         <div className="flex items-center gap-1 group">
                            <code className="text-[10px] bg-slate-100 p-1 rounded truncate max-w-[100px]">{task.id}</code>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => {
                               navigator.clipboard.writeText(task.id)
                               toast.success('Task ID copied')
                            }}>
                               <Copy className="h-3 w-3" />
                            </Button>
                         </div>
                      </div>
                      <div className="space-y-1">
                         <Label className="text-micro text-[#777169] uppercase tracking-wider">Version</Label>
                         <p className="text-body-standard font-mono">v{task.version}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                       <Label className="text-micro text-[#777169] uppercase tracking-wider">Created</Label>
                       <p className="text-body-standard text-[#4e4e4e]">{new Date(task.createdAt).toLocaleString()}</p>
                    </div>

                    <div className="space-y-1">
                       <Label className="text-micro text-[#777169] uppercase tracking-wider">Last Updated</Label>
                       <p className="text-body-standard text-[#4e4e4e]">{new Date(task.updatedAt).toLocaleString()}</p>
                    </div>

                    {isManager && (
                      <div className="pt-2 border-t mt-4">
                         <Button 
                           variant="outline" 
                           size="sm" 
                           className="w-full text-caption"
                           onClick={() => updateTask({ id: taskId, data: { isBlocked: !task.isBlocked } })}
                         >
                           {task.isBlocked ? 'Mark as Unblocked' : 'Mark as Blocked'}
                         </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            </ScrollArea>
          </TabsContent>

            <TabsContent value="comments" className="mt-0 flex flex-col h-[calc(100vh-140px)]">
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
                  {commentsLoading ? (
                    <p className="text-caption text-muted-foreground">Loading comments...</p>
                  ) : comments && comments.length > 0 ? (
                    comments.map(comment => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-6 w-6 mt-0.5">
                          <AvatarImage src={comment.user.avatar || undefined} />
                          <AvatarFallback>{comment.user.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                             <div className="flex items-baseline gap-2">
                                <span className="text-body-standard font-medium">{comment.user.name}</span>
                                <span className="text-micro text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                             </div>
                             {(comment.userId === session?.id || session?.role === 'ADMIN') && (
                               <div className="flex gap-1">
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-4 w-4 text-muted-foreground hover:text-primary"
                                   onClick={() => {
                                      setEditingCommentId(comment.id)
                                      setEditingText(comment.text)
                                   }}
                                 >
                                   <X className="h-3 w-3" /> {/* Using X as an 'edit' icon or similar for now or Pen */}
                                   <span className="sr-only">Edit</span>
                                 </Button>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   className="h-4 w-4 text-muted-foreground hover:text-destructive"
                                   onClick={() => deleteComment(comment.id)}
                                 >
                                   <Trash2 className="h-3 w-3" />
                                 </Button>
                               </div>
                             )}
                          </div>
                          {editingCommentId === comment.id ? (
                            <div className="space-y-2 mt-1">
                               <Input 
                                 value={editingText} 
                                 onChange={(e) => setEditingText(e.target.value)}
                                 onKeyDown={(e) => {
                                    if(e.key === 'Enter' && editingText.trim()) {
                                       updateComment({ id: comment.id, text: editingText })
                                       setEditingCommentId(null)
                                    }
                                 }}
                               />
                               <div className="flex gap-1">
                                  <Button size="sm" className="h-7 text-[10px]" onClick={() => {
                                     updateComment({ id: comment.id, text: editingText })
                                     setEditingCommentId(null)
                                  }}>Save</Button>
                                  <Button variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => setEditingCommentId(null)}>Cancel</Button>
                               </div>
                            </div>
                          ) : (
                            <p className="text-body-standard bg-[#f5f5f5] p-2 rounded-lg rounded-tl-none">{comment.text}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-body-standard text-[#777169]">No comments yet. Start the conversation!</p>
                  )}
                </div>
              </ScrollArea>
              
              <div className="mt-auto pt-4 border-t bg-white">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Write a comment..." 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => {
                      if(e.key === 'Enter' && newComment.trim()) {
                         addComment({ taskId, text: newComment })
                         setNewComment('')
                      }
                    }}
                  />
                  <Button 
                    size="icon" 
                    disabled={!newComment.trim()} 
                    onClick={() => {
                       if(newComment.trim()) {
                         addComment({ taskId, text: newComment })
                         setNewComment('')
                       }
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="dependencies" className="mt-0 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-caption text-[#777169]">Manage tasks that block this one.</p>
                <Button variant="outline" size="sm" onClick={() => setIsDepDialogOpen(true)}>
                  <Link2 className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              
              <div className="space-y-4">
                {task.blockers && task.blockers.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-caption text-[#777169] uppercase tracking-wider font-semibold">Blocked by ({task.blockers.length})</Label>
                    {task.blockers.filter((b: any) => b.blocker).map(({ blocker }: any) => (
                      <div key={blocker.id} className="p-3 bg-red-50 border border-red-100 rounded-[8px] flex items-center justify-between gap-2 group">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                          <div>
                            <p className="text-body-standard font-medium text-red-900 line-clamp-1">{blocker.title}</p>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeDependency({ taskId: task.id, linkedTaskId: blocker.id, type: 'IS_BLOCKED_BY' })}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {task.blocking && task.blocking.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-caption text-[#777169] uppercase tracking-wider font-semibold">Blocking ({task.blocking.length})</Label>
                    {task.blocking.filter((b: any) => b.blocking).map(({ blocking }: any) => (
                      <div key={blocking.id} className="p-3 bg-amber-50 border border-amber-100 rounded-[8px] flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          <p className="text-body-standard font-medium text-amber-900 line-clamp-1">{blocking.title}</p>
                      </div>
                    ))}
                  </div>
                )}

                {(!task.blockers || task.blockers.length === 0) && (!task.blocking || task.blocking.length === 0) && (
                  <div className="text-center py-6">
                     <Link2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                     <p className="text-body-standard text-[#777169]">No dependencies linked.</p>
                  </div>
                )}
              </div>
              
              <DependencySelectDialog
                 open={isDepDialogOpen}
                 onOpenChange={setIsDepDialogOpen}
                 task={task}
                 availableTasks={availableTasks}
                 onAddDependency={async (blockerId) => {
                    await addDependency({ taskId: task.id, linkedTaskId: blockerId, type: 'BLOCKS' }).unwrap()
                 }}
              />
            </TabsContent>

            <TabsContent value="attachments" className="mt-0 space-y-4 h-[calc(100vh-140px)] flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-caption font-semibold text-[#777169] uppercase tracking-wider">Files & Attachments</h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={async () => {
                    // Simulate file upload
                    const fileName = prompt('Enter a demo filename:', 'Project Specification.pdf')
                    if (!fileName) return
                    
                    setIsUploading(true)
                    try {
                      await addAttachment({
                        taskId: task.id,
                        name: fileName,
                        url: '#', // In a real app, this would be the uploaded S3/local path
                        type: fileName.endsWith('.pdf') ? 'application/pdf' : 'image/png',
                        size: Math.floor(Math.random() * 5000000)
                      }).unwrap()
                      toast.success('File attached successfully')
                    } catch (err: any) {
                      toast.error('Failed to attach file')
                    } finally {
                      setIsUploading(false)
                    }
                  }}
                  disabled={isUploading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {task.attachments && task.attachments.length > 0 ? (
                    task.attachments.map((file) => (
                      <div key={file.id} className="p-3 bg-white border border-[rgba(0,0,0,0.05)] rounded-[12px] group hover:border-primary/20 transition-all shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[8px] bg-slate-100 flex items-center justify-center text-slate-500">
                             {file.type.includes('image') ? (
                               <Activity className="h-5 w-5" /> // Simplified for demo
                             ) : (
                               <FileText className="h-5 w-5" />
                             )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body-standard font-medium truncate">{file.name}</p>
                            <p className="text-micro text-[#777169]">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB • {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-[#777169]" asChild>
                               <a href={file.url} download>
                                 <Download className="h-4 w-4" />
                               </a>
                             </Button>
                             {(file.userId === session?.id || isManager) && (
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                 onClick={() => deleteAttachment(file.id)}
                               >
                                 <Trash2 className="h-4 w-4" />
                               </Button>
                             )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-30">
                       <Paperclip className="h-10 w-10 mx-auto mb-2" />
                       <p className="text-body-standard font-waldenburg">No attachments yet</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="activity" className="mt-0">
              {auditLog && auditLog.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {auditLog.map((log: any) => {
                    const actionSentences: Record<string, string> = {
                      'TASK_CREATED': 'created this task',
                      'TASK_MOVED': `moved task to ${log.changes?.to_column_name || 'new column'}`,
                      'TASK_ASSIGNED': log.targetId === log.actorId ? 'self-assigned this task' : `assigned task to ${log.target?.name || 'someone'}`,
                      'TASK_UPDATED': 'updated task details',
                      'COMMENT_ADDED': 'commented on this task',
                      'COMMENT_DELETED': 'deleted a comment',
                      'DEPENDENCY_ADDED': `linked a dependency: ${log.changes?.type === 'BLOCKS' ? 'Blocks' : 'Is blocked by'}`,
                      'DEPENDENCY_REMOVED': 'removed a task dependency',
                    }

                    return (
                      <div key={log.id} className="flex gap-3 items-start">
                        <Avatar className="h-6 w-6 mt-0.5 border shadow-sm">
                          <AvatarImage src={log.actor?.avatar || undefined} />
                          <AvatarFallback className="text-[10px] bg-slate-100">{log.actor?.name?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-body-standard leading-tight">
                            <span className="font-semibold text-black">{log.actor?.name}</span>{' '}
                            <span className="text-[#64748b]">{actionSentences[log.action] || log.action.replace(/_/g, ' ').toLowerCase()}</span>
                          </p>
                          <p className="text-[10px] text-[#94a3b8] mt-0.5 uppercase tracking-tight font-medium font-waldenburg">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                   <Activity className="h-8 w-8 mb-2" />
                   <p className="text-body-standard text-[#777169]">No activity recorded yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

      {/* Delete Task Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-section-heading font-waldenburg font-light">Delete Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-body-standard">
              Are you sure you want to delete <strong>{task.title}</strong>? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteTask}>Delete Task</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
