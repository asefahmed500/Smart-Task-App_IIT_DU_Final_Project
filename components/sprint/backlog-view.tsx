'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBacklogTasks, assignTaskToSprint, getSprintsByBoard, updateTaskIssueFields, getEpicsByBoard } from '@/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
  MessageSquare,
  CheckSquare,
  GitBranch,
  Search,
  Plus,
  Layers,
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

interface Task {
  id: string
  title: string
  description: string | null
  priority: string
  issueType: string | null
  storyPoints: number | null
  epicId: string | null
  createdAt: string
  assignee: { id: string; name: string | null; image: string | null } | null
  tags: { id: string; name: string; color: string }[]
  column: { id: string; name: string } | null
  _count: { comments: number; subtasks: number }
}

interface Sprint {
  id: string
  name: string
  status: string
  _count: { tasks: number }
}

interface Board {
  id: string
  name: string
}

export function BacklogView({
  boardId,
  boards,
  basePath = '/manager',
  readOnly = false,
}: {
  boardId: string
  boards: Board[]
  basePath?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [epics, setEpics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [targetSprint, setTargetSprint] = useState('')
  const [editForm, setEditForm] = useState({ issueType: '', storyPoints: '', epicId: '' })
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')

  useEffect(() => {
    loadData()
  }, [boardId])

  async function loadData() {
    setLoading(true)
    const [tasksRes, sprintsRes, epicsRes] = await Promise.all([
      getBacklogTasks(boardId),
      getSprintsByBoard(boardId),
      getEpicsByBoard(boardId),
    ])
    if (tasksRes.success) setTasks(tasksRes.data || [])
    if (sprintsRes.success) setSprints(sprintsRes.data || [])
    if (epicsRes.success) setEpics(epicsRes.data || [])
    setLoading(false)
  }

  async function handleAssignToSprint() {
    if (!selectedTask || !targetSprint) return
    const res = await assignTaskToSprint({
      taskId: selectedTask.id,
      sprintId: targetSprint,
    })
    if (res.success) {
      toast.success('Task assigned to sprint')
      setAssignDialogOpen(false)
      setTargetSprint('')
      loadData()
    } else {
      toast.error(res.error || 'Failed to assign')
    }
  }

  async function handleUpdateIssueFields() {
    if (!selectedTask) return
    const res = await updateTaskIssueFields({
      taskId: selectedTask.id,
      issueType: editForm.issueType || undefined,
      storyPoints: editForm.storyPoints ? parseInt(editForm.storyPoints) : null,
      epicId: editForm.epicId || null,
    })
    if (res.success) {
      toast.success('Task updated')
      setEditDialogOpen(false)
      loadData()
    } else {
      toast.error(res.error || 'Failed to update')
    }
  }

  function openEditDialog(task: Task) {
    setSelectedTask(task)
    setEditForm({
      issueType: task.issueType || '',
      storyPoints: task.storyPoints?.toString() || '',
      epicId: task.epicId || '',
    })
    setEditDialogOpen(true)
  }

  function openAssignDialog(task: Task) {
    setSelectedTask(task)
    setAssignDialogOpen(true)
  }

  const activeSprints = sprints.filter(
    (s) => s.status === 'PLANNED' || s.status === 'ACTIVE'
  )

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesType = filterType === 'all' || task.issueType === filterType
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    return matchesSearch && matchesType && matchesPriority
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <GitBranch className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading backlog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backlog</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {tasks.length} unscheduled task{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {boards.length > 1 && (
            <Select
              value={boardId}
              onValueChange={(v) => router.push(`${basePath}/backlog?boardId=${v}`)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/dashboard/board/${boardId}`)}
          >
            Open Board
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="BUG">Bug</SelectItem>
            <SelectItem value="FEATURE">Feature</SelectItem>
            <SelectItem value="STORY">Story</SelectItem>
            <SelectItem value="TASK">Task</SelectItem>
            <SelectItem value="SUBTASK">Subtask</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No backlog items</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
              {tasks.length === 0
                ? 'All tasks are assigned to sprints. Create new tasks from the board.'
                : 'No tasks match your filters. Try adjusting your search.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <Card
              key={task.id}
              className={`transition-colors group ${readOnly ? 'cursor-default' : 'cursor-pointer hover:border-primary/50'}`}
              onClick={() => { if (!readOnly) openEditDialog(task) }}
            >
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
                      {task.storyPoints && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {task.storyPoints} pts
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {task.column?.name || "Unknown"}
                      </Badge>
                    </div>
                    <h3 className="font-medium group-hover:text-primary transition-colors">
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
                          {task.assignee.name || task.assignee.id.slice(0, 8)}
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
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        openAssignDialog(task)
                      }}
                      disabled={activeSprints.length === 0}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Sprint
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
            <DialogDescription>
              {selectedTask?.title}
            </DialogDescription>
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
            <div>
              <Label>Story Points</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={editForm.storyPoints}
                onChange={(e) => setEditForm((f) => ({ ...f, storyPoints: e.target.value }))}
                placeholder="e.g. 1, 2, 3, 5, 8, 13"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Fibonacci sequence recommended: 1, 2, 3, 5, 8, 13, 21
              </p>
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <Layers className="size-3" />
                Epic
              </Label>
              <Select
                value={editForm.epicId || '__none__'}
                onValueChange={(v) => setEditForm((f) => ({ ...f, epicId: v === '__none__' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select epic" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No epic</SelectItem>
                  {epics.map((epic) => (
                    <SelectItem key={epic.id} value={epic.id}>
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: epic.color }} />
                        {epic.name}
                      </div>
                    </SelectItem>
                  ))}
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

      {/* Assign to Sprint Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Sprint</DialogTitle>
            <DialogDescription>
              {selectedTask?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Label>Target Sprint</Label>
            <Select value={targetSprint} onValueChange={setTargetSprint}>
              <SelectTrigger>
                <SelectValue placeholder="Select sprint" />
              </SelectTrigger>
              <SelectContent>
                {activeSprints.map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name}{' '}
                    <span className="text-muted-foreground">
                      ({sprint.status.toLowerCase()})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssignDialogOpen(false)
                setTargetSprint('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAssignToSprint} disabled={!targetSprint}>
              Assign to Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
