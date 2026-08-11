'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSprintDetail, getSprintMetrics, removeTaskFromSprint, updateTaskIssueFields, updateSprintStatus } from '@/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CalendarDays,
  User,
  ArrowLeft,
  Target,
  Clock,
  Trash2,
  MessageSquare,
  CheckSquare,
  Play,
  CheckCircle2,
  XCircle,
} from 'lucide-react'

const ISSUE_TYPE_COLORS: Record<string, string> = {
  BUG: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  FEATURE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  STORY: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  TASK: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
  EPIC: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  SUBTASK: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

const STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-slate-100 text-slate-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

interface SprintTask {
  id: string
  title: string
  description: string | null
  priority: string
  issueType: string | null
  storyPoints: number | null
  status: string | null
  assignee: { id: string; name: string | null; image: string | null } | null
  column: { id: string; name: string } | null
  tags: { id: string; name: string; color: string }[]
  _count: { comments: number; attachments: number; checklists: number; subtasks: number }
}

interface SprintData {
  id: string
  name: string
  goal: string | null
  startDate: string
  endDate: string
  status: string
  board: { id: string; name: string }
  tasks: SprintTask[]
}

interface MetricsData {
  totalTasks: number
  completedTasks: number
  totalStoryPoints: number
  completedStoryPoints: number
  completionRate: number
  scopeCompletionRate: number
  totalTimeLogged: number
}

export function SprintDetail({
  sprintId,
  basePath = '/manager',
  readOnly = false,
}: {
  sprintId: string
  basePath?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [sprint, setSprint] = useState<SprintData | null>(null)
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<SprintTask | null>(null)
  const [editForm, setEditForm] = useState({ issueType: '', storyPoints: '' })
  const [taskFilter, setTaskFilter] = useState('all')

  useEffect(() => {
    loadData()
  }, [sprintId])

  async function loadData() {
    setLoading(true)
    const [detailRes, metricsRes] = await Promise.all([
      getSprintDetail(sprintId),
      getSprintMetrics(sprintId),
    ])
    if (detailRes.success) setSprint(detailRes.data)
    if (metricsRes.success) setMetrics(metricsRes.data)
    setLoading(false)
  }

  async function handleRemoveTask(taskId: string) {
    const res = await removeTaskFromSprint({ taskId })
    if (res.success) {
      toast.success('Task removed from sprint')
      loadData()
    } else {
      toast.error(res.error || 'Failed to remove')
    }
  }

  async function handleUpdateIssueFields() {
    if (!selectedTask) return
    const res = await updateTaskIssueFields({
      taskId: selectedTask.id,
      issueType: editForm.issueType || undefined,
      storyPoints: editForm.storyPoints ? parseInt(editForm.storyPoints) : null,
    })
    if (res.success) {
      toast.success('Task updated')
      setEditDialogOpen(false)
      loadData()
    } else {
      toast.error(res.error || 'Failed to update')
    }
  }

  async function handleStatusChange(status: string) {
    const res = await updateSprintStatus({ id: sprintId, status })
    if (res.success) {
      toast.success(`Sprint ${status.toLowerCase()}`)
      loadData()
    } else {
      toast.error(res.error || 'Failed to update status')
    }
  }

  // One-click complete: if the sprint is still PLANNED, auto-start it first,
  // then complete it — the manager shouldn't have to press two buttons.
  async function handleComplete() {
    if (!sprint) return
    if (sprint.status === 'PLANNED') {
      const start = await updateSprintStatus({ id: sprintId, status: 'ACTIVE' })
      if (!start.success) {
        toast.error(start.error || 'Failed to start sprint')
        return
      }
    }
    await handleStatusChange('COMPLETED')
  }

  function openEditDialog(task: SprintTask) {
    setSelectedTask(task)
    setEditForm({
      issueType: task.issueType || '',
      storyPoints: task.storyPoints?.toString() || '',
    })
    setEditDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CalendarDays className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading sprint...</p>
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground text-lg">Sprint not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(`${basePath}/sprints`)}>
          Back to Sprints
        </Button>
      </div>
    )
  }

  const filteredTasks =
    taskFilter === 'all'
      ? sprint.tasks
      : sprint.tasks.filter((t) => t.column?.name?.toLowerCase() === taskFilter.toLowerCase())

  const getDuration = () => {
    const start = new Date(sprint.startDate)
    const end = new Date(sprint.endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`${basePath}/sprints?boardId=${sprint.board.id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{sprint.name}</h1>
            {sprint.goal && (
              <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1">
                <Target className="h-3 w-3" />
                {sprint.goal}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={STATUS_COLORS[sprint.status]}>
            {sprint.status}
          </Badge>
          {!readOnly && sprint.status === 'PLANNED' && (
            <Button size="sm" onClick={() => handleStatusChange('ACTIVE')} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Start Sprint
            </Button>
          )}
          {!readOnly && (sprint.status === 'ACTIVE' || sprint.status === 'PLANNED') && (
            <Button size="sm" variant="outline" onClick={handleComplete} className="gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Complete Sprint
            </Button>
          )}
          {!readOnly && (sprint.status === 'PLANNED' || sprint.status === 'ACTIVE') && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => handleStatusChange('CANCELLED')}
            >
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          )}
          {!readOnly && sprint.status === 'CANCELLED' && (
            <Button size="sm" variant="outline" onClick={() => handleStatusChange('PLANNED')}>
              Reopen
            </Button>
          )}
        </div>
      </div>

      {/* Nav tabs — Plan/Review/Retro are manager-only routes; hide them for
          members (those routes 404 at /member/*). */}
      <div className="flex items-center gap-1 border-b border-hairline pb-0">
        {[
          { label: 'Detail', href: `${basePath}/sprints/${sprintId}` },
          ...(basePath !== '/member'
            ? [
                { label: 'Plan', href: `${basePath}/sprints/${sprintId}/plan` },
              ]
            : []),
          { label: 'Board', href: `${basePath}/sprints/${sprintId}/board` },
          ...(basePath !== '/member'
            ? [
                { label: 'Review', href: `${basePath}/sprints/${sprintId}/review` },
                { label: 'Retro', href: `${basePath}/sprints/${sprintId}/retro` },
              ]
            : []),
        ].map((tab) => {
          const isActive = pathname === tab.href
          return (
            <Button
              key={tab.label}
              variant="ghost"
              size="sm"
              className={`rounded-b-none border-b-2 transition-colors ${
                isActive
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted-text hover:text-ink hover:border-hairline'
              }`}
              onClick={() => router.push(tab.href)}
            >
              {tab.label}
            </Button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{metrics?.totalTasks || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{metrics?.completedTasks || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {(metrics?.totalTasks || 0) - (metrics?.completedTasks || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{metrics?.completionRate || 0}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-4 w-4" />
          {new Date(sprint.startDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}{' '}
          -{' '}
          {new Date(sprint.endDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {getDuration()} days
        </span>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks ({sprint.tasks.length})</h2>
        <Select value={taskFilter} onValueChange={setTaskFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by column" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Columns</SelectItem>
            {Array.from(new Set(sprint.tasks.map((t) => t.column?.name).filter(Boolean) as string[])).map((col) => (
              <SelectItem key={col} value={col}>
                {col}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {sprint.tasks.length === 0
                ? 'No tasks in this sprint yet. Add tasks from the backlog.'
                : 'No tasks match the selected filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:border-primary/50 transition-colors group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      {task.issueType && (
                        <Badge variant="secondary" className={ISSUE_TYPE_COLORS[task.issueType]}>
                          {task.issueType}
                        </Badge>
                      )}
                      <Badge variant="secondary" className={PRIORITY_COLORS[task.priority]}>
                        {task.priority}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {task.column?.name || "Unknown"}
                      </Badge>
                    </div>
                    <h3
                      className={`font-medium transition-colors ${readOnly ? '' : 'cursor-pointer hover:text-primary'}`}
                      onClick={() => { if (!readOnly) openEditDialog(task) }}
                    >
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignee.name || 'Unassigned'}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {task._count?.comments || 0}
                      </span>
                      {task._count?.subtasks && task._count.subtasks > 0 && (
                        <span className="flex items-center gap-1">
                          <CheckSquare className="h-3 w-3" />
                          {task._count.subtasks}
                        </span>
                      )}
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveTask(task.id)}
                      title="Remove from sprint"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>{selectedTask?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Issue Type</Label>
              <Select
                value={editForm.issueType || '__none__'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, issueType: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="FEATURE">Feature</SelectItem>
                  <SelectItem value="STORY">Story</SelectItem>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="SUBTASK">Subtask</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateIssueFields}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
