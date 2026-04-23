'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { useGetTaskQuery, useGetTaskAuditQuery, useUpdateTaskMutation, useGetTaskCommentsQuery, useAddCommentMutation, useDeleteCommentMutation, useUpdateCommentMutation, useAddTaskDependencyMutation, useRemoveTaskDependencyMutation, useDeleteTaskMutation, useAddAttachmentMutation, useDeleteAttachmentMutation } from '@/lib/slices/tasksApi'
import { useGetBoardsQuery, type Priority } from '@/lib/slices/boardsApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { cn } from '@/lib/utils/cn'
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
import { 
  X, 
  MoreVertical, 
  Trash2, 
  Calendar, 
  User as UserIcon, 
  CheckCircle, 
  CheckCircle2,
  Clock, 
  AlertCircle, 
  Link2, 
  Paperclip, 
  MessageSquare, 
  Activity, 
  Copy, 
  Edit,
  Edit2, 
  Save, 
  Tag,
  Plus,
  Download,
  FileText
} from 'lucide-react'
import { TimeTrackingPanel } from './time-tracking-panel'
import { formatDistanceToNow } from 'date-fns'
import { setSelectedTask, setRightSidebarOpen } from '@/lib/slices/uiSlice'
import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import DependencySelectDialog from './dependency-select'
import DueTimeline from '@/components/kanban/due-timeline'
import CommentsPanel from './comments-panel'
import FileUpload from './file-upload'
import AttachmentList from './attachment-list'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { onTaskUpdate, onDependencyUpdate } from '@/lib/socket'

import { TaskDetailSkeleton } from './task-detail-skeleton'

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
  const { data: task, isLoading, refetch } = useGetTaskQuery(taskId)
  const { data: auditLog } = useGetTaskAuditQuery(taskId)
  const [updateTask] = useUpdateTaskMutation()
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedDescription, setEditedDescription] = useState('')
  const [editedPriority, setEditedPriority] = useState<Priority>('MEDIUM')
  const [editedAssigneeId, setEditedAssigneeId] = useState('')
  const [editedDueDate, setEditedDueDate] = useState('')
  const [editedLabels, setEditedLabels] = useState<string[]>([])

  const [addDependency] = useAddTaskDependencyMutation()
  const [removeDependency] = useRemoveTaskDependencyMutation()
  const { data: boards } = useGetBoardsQuery()
  const { data: session } = useGetSessionQuery()
  const [isDepDialogOpen, setIsDepDialogOpen] = useState(false)
  const [deleteTask] = useDeleteTaskMutation()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000)
    
    // Listen for task updates
    const taskCleanup = onTaskUpdate((updatedTask) => {
      if (updatedTask.id === taskId) {
        refetch()
      }
    })

    // Listen for dependency updates
    const depCleanup = onDependencyUpdate((data) => {
      if (data.taskId === taskId) {
        refetch()
      }
    })

    return () => {
      clearInterval(interval)
      taskCleanup()
      depCleanup()
    }
  }, [taskId, refetch])
  
  const isManager = session?.role === 'MANAGER' || session?.role === 'ADMIN'

  // Find available tasks across board for deps
  const activeBoard = boards?.find(b => b.id === task?.boardId)
  const availableTasks = activeBoard?.tasks || []

  if (isLoading) {
    return <TaskDetailSkeleton />
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
    await updateTask({
      id: taskId,
      data: {
        title: editedTitle,
        description: editedDescription,
        priority: editedPriority,
        assigneeId: editedAssigneeId || undefined,
        dueDate: editedDueDate || undefined,
        labels: editedLabels,
      }
    })
    setIsEditing(false)
  }

  const handleStartEdit = () => {
    setEditedTitle(task.title)
    setEditedDescription(task.description || '')
    setEditedPriority((task.priority || 'MEDIUM') as Priority)
    setEditedAssigneeId(task.assigneeId || '')
    setEditedDueDate(task.dueDate || '')
    setEditedLabels(task.labels || [])
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
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-l border-slate-200/50 shadow-[-8px_0_24px_rgba(0,0,0,0.05)]">
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
              value="time" 
              className="flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-[12px] py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-md transition-all duration-200" 
              onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'time' })}
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Time</span>
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
                  <div className="space-y-8 animate-in fade-in duration-500 py-2">
              {isEditing ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label className="text-micro text-warm-gray uppercase tracking-widest font-bold">Title</Label>
                    <Input 
                      value={editedTitle} 
                      onChange={(e) => setEditedTitle(e.target.value)} 
                      className="rounded-card border-border bg-warm-stone/30 focus:ring-primary/10 text-body-standard" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-micro text-warm-gray uppercase tracking-widest font-bold">Description</Label>
                    <Textarea 
                      value={editedDescription} 
                      onChange={(e) => setEditedDescription(e.target.value)} 
                      className="rounded-card border-border bg-warm-stone/30 focus:ring-primary/10 text-body-standard min-h-[160px] resize-none" 
                      placeholder="Add a detailed description..." 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-micro text-warm-gray uppercase tracking-widest font-bold">Priority</Label>
                      <Select value={editedPriority} onValueChange={(v) => setEditedPriority(v as Priority)}>
                        <SelectTrigger className="rounded-comfortable bg-warm-stone/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-micro text-warm-gray uppercase tracking-widest font-bold">Due Date</Label>
                      <Input 
                        type="date" 
                        value={editedDueDate} 
                        onChange={(e) => setEditedDueDate(e.target.value)} 
                        className="rounded-comfortable bg-warm-stone/30" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-micro text-warm-gray uppercase tracking-widest font-bold">Assignee</Label>
                    <Select value={editedAssigneeId || 'unassigned'} onValueChange={(v) => setEditedAssigneeId(v === 'unassigned' ? '' : v)}>
                      <SelectTrigger className="rounded-comfortable bg-warm-stone/30">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {activeBoard?.members?.map((m: any) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.name || m.user.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-micro text-warm-gray uppercase tracking-widest font-bold">Labels</Label>
                    <Input 
                      value={editedLabels.join(', ')} 
                      onChange={(e) => setEditedLabels(e.target.value.split(',').map(l => l.trim()).filter(l => l))} 
                      className="rounded-comfortable bg-warm-stone/30" 
                      placeholder="bug, urgent, frontend" 
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} size="sm" className="rounded-warm-button px-6 shadow-soft-elevation">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={handleCancel} size="sm" className="rounded-warm-button px-6">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={cn("rounded-pill text-[10px] px-2 py-0 uppercase tracking-tighter", priorityColors[task.priority])}>
                          {task.priority}
                        </Badge>
                        <span className="text-micro text-warm-gray uppercase tracking-widest font-bold">Task-{task.id.slice(-4)}</span>
                      </div>
                      <h3 className="text-card-heading text-black tracking-tight">{task.title}</h3>
                      <div className="pt-2">
                        {task.description ? (
                          <p className="text-body-standard text-dark-gray leading-relaxed whitespace-pre-wrap">{task.description}</p>
                        ) : (
                          <p className="text-body-standard text-warm-gray italic">No description provided.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button variant="secondary" size="icon" className="h-10 w-10 rounded-full shadow-soft-elevation hover:scale-105 transition-transform" onClick={handleStartEdit}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {isManager && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-full text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-8 gap-x-12 py-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-micro text-warm-gray uppercase tracking-widest font-bold">
                        <UserIcon className="h-3 w-3" />
                        Assignee
                      </div>
                      {task.assignee ? (
                        <div className="flex items-center gap-2.5 group cursor-default">
                          <Avatar className="h-8 w-8 ring-2 ring-white shadow-soft-elevation">
                            <AvatarImage src={task.assignee.avatar || undefined} />
                            <AvatarFallback className="bg-warm-stone text-warm-gray font-bold">{task.assignee.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <span className="text-nav text-black">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-nav text-warm-gray italic">Unassigned</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-micro text-warm-gray uppercase tracking-widest font-bold">
                        <Calendar className="h-3 w-3" />
                        Due Date
                      </div>
                      {task.dueDate ? (
                        <div className="space-y-2">
                          <span className="text-nav text-black flex items-center gap-1.5">
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <DueTimeline 
                            dueDate={task.dueDate} 
                            currentTime={currentTime} 
                            createdAt={task.createdAt} 
                          />
                        </div>
                      ) : (
                        <span className="text-nav text-warm-gray italic">No due date</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-micro text-warm-gray uppercase tracking-widest font-bold">
                        <Tag className="h-3 w-3" />
                        Labels
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {task.labels && task.labels.length > 0 ? (
                          task.labels.map((label) => (
                            <Badge key={label} variant="secondary" className="rounded-pill text-[10px] px-2.5 py-0.5 bg-warm-stone text-dark-gray border-none font-bold">
                              {label}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-nav text-warm-gray italic">No labels</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-micro text-warm-gray uppercase tracking-widest font-bold">
                        <AlertCircle className="h-3 w-3" />
                        Status
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-pill bg-black text-white text-[10px] px-2.5 py-0.5 uppercase">
                          {task.column?.name || 'Unassigned'}
                        </Badge>
                        {task.isBlocked && (
                          <Badge variant="destructive" className="rounded-pill text-[10px] px-2.5 py-0.5 animate-pulse">
                            Blocked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-border/50" />
                  
                  <div className="space-y-6 pt-2">
                    <div className="grid grid-cols-2 gap-4 bg-warm-stone/20 p-4 rounded-card border border-border/30">
                      <div className="space-y-1">
                         <Label className="text-micro text-warm-gray uppercase tracking-widest font-bold">Created</Label>
                         <p className="text-caption text-dark-gray font-medium">
                            {new Date(task.createdAt).toLocaleDateString()}
                         </p>
                      </div>
                      <div className="space-y-1">
                         <Label className="text-micro text-warm-gray uppercase tracking-widest font-bold">Last Update</Label>
                         <p className="text-caption text-dark-gray font-medium">
                            {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}
                         </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-1 bg-warm-stone/10 rounded-pill border border-border/50 pr-4">
                       <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-soft-elevation">
                             <Link2 className="h-4 w-4 text-dark-gray" />
                          </div>
                          <span className="text-micro text-warm-gray uppercase tracking-widest font-bold">Task ID</span>
                          <code className="text-[10px] font-mono text-dark-gray bg-white px-2 py-0.5 rounded border border-border/50 max-w-[120px] truncate">
                             {task.id}
                          </code>
                       </div>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => {
                          navigator.clipboard.writeText(task.id)
                          toast.success('Task ID copied')
                       }}>
                          <Copy className="h-3.5 w-3.5" />
                       </Button>
                    </div>

                    {isManager && (
                      <Button 
                        variant={task.isBlocked ? "outline" : "secondary"} 
                        size="lg" 
                        className={cn(
                          "w-full rounded-warm-button text-nav font-bold shadow-soft-elevation transition-all",
                          task.isBlocked ? "border-red-200 text-red-600 hover:bg-red-50" : ""
                        )}
                        onClick={() => updateTask({ id: taskId, data: { isBlocked: !task.isBlocked } })}
                      >
                        {task.isBlocked ? (
                          <><CheckCircle2 className="h-4 w-4 mr-2" /> Unblock Task</>
                        ) : (
                          <><AlertCircle className="h-4 w-4 mr-2" /> Mark as Blocked</>
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
            </ScrollArea>
          </TabsContent>


            <TabsContent value="comments" className="mt-0 flex flex-col h-[calc(100vh-140px)]">
              <CommentsPanel taskId={taskId} boardId={task.boardId} />
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
              <div className="space-y-6 flex-1 flex flex-col min-h-0">
                <FileUpload taskId={taskId} />
                <div className="flex-1 min-h-0">
                   <AttachmentList taskId={taskId} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="time" className="mt-0 h-[calc(100vh-140px)] flex flex-col">
              <TimeTrackingPanel taskId={taskId} totalTimeSpent={(task as any).totalTimeSpent ?? 0} />
            </TabsContent>

            <TabsContent value="activity" className="mt-0 flex-1 overflow-hidden">
               <ScrollArea className="h-[calc(100vh-140px)] px-4 pb-8">
                {auditLog && auditLog.length > 0 ? (
                  <div className="relative space-y-8 py-4 before:absolute before:inset-0 before:ml-3 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-100 before:via-slate-100 before:to-transparent">
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
                        <div key={log.id} className="relative flex items-start gap-4 group">
                          {/* Timeline dot */}
                          <div className="absolute left-3 -translate-x-px w-2 h-2 rounded-full bg-white border-2 border-slate-300 group-hover:border-primary transition-colors duration-300 z-10" />
                          
                          <Avatar className="h-8 w-8 ring-4 ring-white shadow-sm border border-slate-100 z-10">
                            <AvatarImage src={log.actor?.avatar || undefined} />
                            <AvatarFallback className="text-[10px] bg-slate-50 text-slate-400 font-bold">{log.actor?.name?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[13px] leading-snug">
                                <span className="font-bold text-slate-900">{log.actor?.name}</span>{' '}
                                <span className="text-slate-500 font-medium">{actionSentences[log.action] || log.action.replace(/_/g, ' ').toLowerCase()}</span>
                              </p>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider">
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                    <div className="p-4 rounded-full bg-slate-50 border border-slate-100">
                      <Activity className="h-8 w-8 text-slate-200" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">No activity yet</p>
                      <p className="text-xs text-slate-500">Every action on this task will be logged here.</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>

      {/* Delete Task Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Task"
        description={`Are you sure you want to delete "${task.title}"? This action cannot be undone and will remove all comments, attachments, and dependencies.`}
        onConfirm={handleDeleteTask}
        confirmText="Delete Task"
        variant="destructive"
      />
    </div>
  )
}
