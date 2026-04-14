'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { useGetTaskQuery, useGetTaskAuditQuery, useUpdateTaskMutation, useGetTaskCommentsQuery, useAddCommentMutation, useAddTaskDependencyMutation } from '@/lib/slices/tasksApi'
import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
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
import { X, Save, MessageSquare, Link2, Activity, Clock, UserIcon, Tag, AlertCircle, CheckCircle2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { setRightSidebarOpen, setSelectedTask } from '@/lib/slices/uiSlice'
import { useState } from 'react'
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
  const [newComment, setNewComment] = useState('')
  
  const [addDependency] = useAddTaskDependencyMutation()
  const { data: boards } = useGetBoardsQuery()
  const [isDepDialogOpen, setIsDepDialogOpen] = useState(false)

  // Find available tasks across board for deps
  const activeBoard = boards?.find(b => b.id === task?.boardId)
  const availableTasks = activeBoard?.tasks || []

  if (isLoading) {
    return (
      <div className="w-[320px] border-l border-[rgba(0,0,0,0.05)] bg-white h-full flex flex-col">
        <div className="h-14 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between px-4">
          <h2 className="text-nav font-medium">Task Details</h2>
          <Button variant="ghost" size="icon" onClick={() => { dispatch(setSelectedTask(null)); dispatch(setRightSidebarOpen(false)) }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 text-center text-body-standard text-[#777169]">Loading...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="w-[320px] border-l border-[rgba(0,0,0,0.05)] bg-white h-full flex flex-col">
        <div className="h-14 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between px-4">
          <h2 className="text-nav font-medium">Task Details</h2>
          <Button variant="ghost" size="icon" onClick={() => { dispatch(setSelectedTask(null)); dispatch(setRightSidebarOpen(false)) }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 text-center text-body-standard text-[#777169]">Task not found</div>
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

  return (
    <div className="w-[320px] border-l border-[rgba(0,0,0,0.05)] bg-white h-full flex flex-col">
      <div className="h-14 border-b border-[rgba(0,0,0,0.05)] flex items-center justify-between px-4">
        <h2 className="text-nav font-medium">Task Details</h2>
        <Button variant="ghost" size="icon" onClick={() => { dispatch(setSelectedTask(null)); dispatch(setRightSidebarOpen(false)) }}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Tabs defaultValue={rightSidebarTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto p-0 mb-4 bg-[#f5f5f5] rounded-[8px]">
              <TabsTrigger value="overview" className="text-caption rounded-[8px]" onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'overview' })}>Overview</TabsTrigger>
              <TabsTrigger value="comments" className="text-caption rounded-[8px]" onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'comments' })}>
                <MessageSquare className="h-3 w-3 mr-1" />
                Comments
              </TabsTrigger>
              <TabsTrigger value="dependencies" className="text-caption rounded-[8px]" onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'dependencies' })}>
                <Link2 className="h-3 w-3 mr-1" />
                Deps
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-caption rounded-[8px]" onClick={() => dispatch({ type: 'ui/setRightSidebarTab', payload: 'activity' })}>
                <Activity className="h-3 w-3 mr-1" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0 space-y-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-caption">Title</Label>
                    <Input value={editedTitle} onChange={(e) => setEditedTitle(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-caption">Description</Label>
                    <Textarea value={editedDescription} onChange={(e) => setEditedDescription(e.target.value)} className="mt-1" rows={4} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} size="sm" className="text-caption">
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} size="sm" className="text-caption">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="text-body font-medium">{task.title}</h3>
                      <Button variant="ghost" size="sm" onClick={handleStartEdit} className="text-caption h-7 px-2">
                        Edit
                      </Button>
                    </div>
                    {task.description && (
                      <p className="text-body-standard text-[#4e4e4e] whitespace-pre-wrap">{task.description}</p>
                    )}
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
                </>
              )}
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
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-body-standard font-medium">{comment.user.name}</span>
                            <span className="text-micro text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                          </div>
                          <p className="text-body-standard bg-[#f5f5f5] p-2 rounded-lg rounded-tl-none">{comment.text}</p>
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
                      <div key={blocker.id} className="p-3 bg-red-50 border border-red-100 rounded-[8px] flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                        <div>
                          <p className="text-body-standard font-medium text-red-900 line-clamp-1">{blocker.title}</p>
                        </div>
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
      </ScrollArea>
    </div>
  )
}
