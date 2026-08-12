'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getBacklogTasks,
  getSprintDetail,
  assignTaskToSprint,
  removeTaskFromSprint,
  updateSprintCapacity,
} from '@/actions'
import { useRealtimeReload } from '@/components/kanban/socket-hooks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { createPortal } from 'react-dom'
import {
  Search,
  Plus,
  X,
  ArrowLeft,
  User,
  Layers,
  Target,
  GripVertical,
  Gauge,
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
  assignee: { id: string; name: string | null; image: string | null } | null
  column: { id: string; name: string } | null
  tags: { id: string; name: string; color: string }[]
  _count: { comments: number; subtasks: number }
}

interface SprintData {
  id: string
  name: string
  goal: string | null
  status: string
  capacity: number | null
  board: { id: string; name: string }
  tasks: Task[]
}

interface CurrentUser {
  id: string
  name: string | null
  image: string | null
}

type Panel = 'backlog' | 'sprint'

function DropZone({
  id,
  label,
  children,
}: {
  id: string
  label?: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div
      ref={setNodeRef}
      data-drop-id={id}
      className={`space-y-2 rounded-lg transition-colors ${
        isOver ? 'bg-accent/10 ring-2 ring-accent/30' : ''
      }`}
    >
      {children}
      {isOver && (
        <div className="h-14 rounded-lg border-2 border-dashed border-accent/40 flex items-center justify-center text-xs text-accent">
          {label || 'Drop here'}
        </div>
      )}
    </div>
  )
}

function TaskCardBody({ task }: { task: Task }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-1">
          {task.issueType && (
            <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${ISSUE_TYPE_COLORS[task.issueType]}`}>
              {task.issueType}
            </Badge>
          )}
          <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </Badge>
          {task.storyPoints ? (
            <Badge variant="outline" className="text-[9px] font-mono px-1.5">
              {task.storyPoints} pts
            </Badge>
          ) : null}
        </div>
        <h4 className="text-sm font-medium line-clamp-1">{task.title}</h4>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-text">
          {task.assignee && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {task.assignee.name || 'Unassigned'}
            </span>
          )}
          <span>{task.column?.name || 'Unknown'}</span>
        </div>
      </div>
    </div>
  )
}

function DraggableTaskCard({
  id,
  task,
  readOnly,
  action,
  onAction,
  title,
}: {
  id: string
  task: Task
  readOnly: boolean
  action: 'add' | 'remove'
  onAction: (taskId: string) => void
  title: string
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: { panel: action === 'add' ? 'backlog' : 'sprint', taskId: task.id, task },
    disabled: readOnly,
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`border-hairline group hover:border-accent/30 transition-colors ${
        isDragging ? 'opacity-40' : ''
      }`}
    >
      <CardContent className="p-3 relative flex items-start gap-1">
        {!readOnly && (
          <div
            {...attributes}
            {...listeners}
            className="mt-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            title="Drag to move"
          >
            <GripVertical className="h-4 w-4 text-muted-text" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <TaskCardBody task={task} />
        </div>
        {!readOnly && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onAction(task.id)}
            title={title}
          >
            {action === 'add' ? (
              <Plus className="h-4 w-4 text-accent" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export function SprintPlanningBoard({
  sprintId,
  basePath = '/manager',
  readOnly = false,
  boardId,
  currentUser,
}: {
  sprintId: string
  basePath?: string
  readOnly?: boolean
  boardId?: string
  currentUser?: CurrentUser
}) {
  const router = useRouter()
  const [sprint, setSprint] = useState<SprintData | null>(null)
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [sprintTasks, setSprintTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [backlogSearch, setBacklogSearch] = useState('')
  const [sprintSearch, setSprintSearch] = useState('')
  const [backlogType, setBacklogType] = useState('all')
  const [backlogPriority, setBacklogPriority] = useState('all')
  const [backlogAssignee, setBacklogAssignee] = useState('all')
  const [editCapacity, setEditCapacity] = useState(false)
  const [capacityInput, setCapacityInput] = useState('')
  const [activeDrag, setActiveDrag] = useState<{ task: Task; panel: Panel } | null>(null)

  useEffect(() => {
    loadData()
  }, [sprintId])

  useRealtimeReload(
    boardId,
    currentUser,
    [
      'sprint:updated',
      'sprint:statusChanged',
      'task:sprintAssigned',
      'task:sprintRemoved',
      'task:issueFieldsUpdated',
      'task:created',
      'task:updated',
      'task:deleted',
    ],
    () => loadData(true),
  )

  async function loadData(silent = false) {
    if (!silent) setLoading(true)
    const [detailRes] = await Promise.all([getSprintDetail(sprintId)])
    if (detailRes.success) {
      const d = detailRes.data as SprintData
      setSprint(d)
      setSprintTasks(d.tasks || [])
      setCapacityInput(d.capacity?.toString() || '')

      const bid = boardId || d.board?.id
      if (bid) {
        const backlogRes = await getBacklogTasks(bid)
        if (backlogRes.success) setBacklogTasks(backlogRes.data || [])
      }
    }
    setLoading(false)
  }

  async function handleAddToSprint(taskId: string) {
    const res = await assignTaskToSprint({ taskId, sprintId })
    if (res.success) {
      toast.success('Task added to sprint')
      loadData(true)
    } else {
      toast.error(res.error || 'Failed to add')
    }
  }

  async function handleRemoveFromSprint(taskId: string) {
    const res = await removeTaskFromSprint({ taskId })
    if (res.success) {
      toast.success('Task removed from sprint')
      loadData(true)
    } else {
      toast.error(res.error || 'Failed to remove')
    }
  }

  async function handleSaveCapacity() {
    const cap = parseInt(capacityInput)
    const res = await updateSprintCapacity({
      id: sprintId,
      capacity: isNaN(cap) ? null : cap,
    })
    if (res.success) {
      toast.success('Capacity saved')
      setEditCapacity(false)
      loadData(true)
    } else {
      toast.error(res.error || 'Failed to save capacity')
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveDrag(null)
      const { active, over } = event
      if (!over) return
      const activeData = active.data.current as { panel?: Panel; taskId?: string } | undefined
      if (!activeData?.taskId) return
      if (activeData.panel === 'backlog' && over.id === 'sprint-drop') {
        await handleAddToSprint(activeData.taskId)
      } else if (activeData.panel === 'sprint' && over.id === 'backlog-drop') {
        await handleRemoveFromSprint(activeData.taskId)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sprintId],
  )

  const uniqueAssignees = useCallback(() => {
    const map = new Map<string, { id: string; name: string | null }>()
    backlogTasks.forEach((t) => {
      if (t.assignee) map.set(t.assignee.id, t.assignee)
    })
    sprintTasks.forEach((t) => {
      if (t.assignee) map.set(t.assignee.id, t.assignee)
    })
    return Array.from(map.values())
  }, [backlogTasks, sprintTasks])

  const filteredBacklog = backlogTasks.filter((t) => {
    if (backlogSearch && !t.title.toLowerCase().includes(backlogSearch.toLowerCase())) return false
    if (backlogType !== 'all' && t.issueType !== backlogType) return false
    if (backlogPriority !== 'all' && t.priority !== backlogPriority) return false
    if (backlogAssignee !== 'all' && t.assignee?.id !== backlogAssignee) return false
    return true
  })

  const filteredSprint = sprintTasks.filter((t) => {
    if (!sprintSearchActive(t, sprintSearch)) return false
    return true
  })

  function sprintSearchActive(t: Task, q: string): boolean {
    if (!q) return true
    const query = q.toLowerCase()
    return t.title.toLowerCase().includes(query) || (t.description?.toLowerCase() || '').includes(query)
  }

  const totalAssigned = sprintTasks.length
  const capacity = sprint?.capacity || 0
  const capacityPct = capacity > 0 ? Math.round((totalAssigned / capacity) * 100) : 0
  const overCapacity = capacity > 0 && totalAssigned > capacity

  const backlogPoints = backlogTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
  const sprintPoints = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent mx-auto mb-4" />
          <p className="text-muted-text">Loading planning board...</p>
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-text text-lg">Sprint not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push(`${basePath}/sprints`)}>
          Back to Sprints
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push(`${basePath}/sprints/${sprintId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{sprint.name} — Planning</h1>
          {sprint.goal && (
            <p className="text-sm text-muted-text flex items-center gap-1 mt-1">
              <Target className="h-3 w-3" />
              {sprint.goal}
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-xs">
          {sprint.status}
        </Badge>
      </div>

      {/* Capacity Bar */}
      <Card className="border-hairline">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center gap-1.5">
              <Gauge className="h-4 w-4 text-muted-text" />
              Capacity
            </span>
            <div className="flex items-center gap-2">
              {editCapacity ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    className="w-20 h-8 text-sm"
                    placeholder="Tasks"
                  />
                  <Button size="sm" variant="outline" className="h-8" onClick={handleSaveCapacity}>
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditCapacity(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditCapacity(true)} disabled={readOnly}>
                  {capacity > 0 ? `${capacity} tasks capacity` : 'Set capacity'}
                </Button>
              )}
            </div>
          </div>
          {capacity > 0 && (
            <div className="space-y-1">
              <div className="h-2 bg-canvas-soft rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overCapacity ? 'bg-red-500' : capacityPct > 80 ? 'bg-amber-500' : 'bg-accent'
                  }`}
                  style={{ width: `${Math.min(capacityPct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-text">
                <span>
                  {totalAssigned} / {capacity} tasks ({capacityPct}%)
                </span>
                <span>
                  {sprintPoints} story points committed
                </span>
                {overCapacity && <span className="text-red-500 font-medium">Over capacity!</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Backlog */}
        <Card className="border-hairline">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>
                Backlog ({backlogTasks.length}
                {backlogPoints > 0 && <span className="text-muted-text font-normal"> · {backlogPoints} pts</span>})
              </span>
              {sprint?.board?.name && (
                <Badge variant="outline" className="text-[10px] font-normal bg-primary/5 border-primary/10 gap-1">
                  <Layers className="h-3 w-3" />
                  {sprint.board.name}
                </Badge>
              )}
            </CardTitle>
            <p className="text-[11px] text-muted-text">
              Unscheduled tasks on this board — drag one into the sprint to plan it. Tasks in a Done
              column are excluded automatically.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-text" />
              <Input
                placeholder="Search backlog..."
                value={backlogSearch}
                onChange={(e) => setBacklogSearch(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Select value={backlogType} onValueChange={setBacklogType}>
                <SelectTrigger className="h-8 text-xs w-[110px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="FEATURE">Feature</SelectItem>
                  <SelectItem value="STORY">Story</SelectItem>
                  <SelectItem value="TASK">Task</SelectItem>
                  <SelectItem value="EPIC">Epic</SelectItem>
                  <SelectItem value="SUBTASK">Subtask</SelectItem>
                </SelectContent>
              </Select>
              <Select value={backlogPriority} onValueChange={setBacklogPriority}>
                <SelectTrigger className="h-8 text-xs w-[110px]">
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
              <Select value={backlogAssignee} onValueChange={setBacklogAssignee}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {uniqueAssignees().map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name || 'Unassigned'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto space-y-2 p-3 relative">
            <DropZone id="backlog-drop">
              {filteredBacklog.length === 0 ? (
                <div className="text-center py-8 text-muted-text text-sm">
                  {backlogSearch || backlogType !== 'all' || backlogPriority !== 'all' || backlogAssignee !== 'all'
                    ? 'No matching tasks'
                    : 'Backlog is empty'}
                </div>
              ) : (
                filteredBacklog.map((task) => (
                  <DraggableTaskCard
                    key={task.id}
                    id={`b-${task.id}`}
                    task={task}
                    readOnly={readOnly}
                    action="add"
                    onAction={handleAddToSprint}
                    title="Add to sprint"
                  />
                ))
              )}
            </DropZone>
          </CardContent>
        </Card>

        {/* Right: Sprint Tasks */}
        <Card className="border-hairline">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>
                Sprint Tasks ({sprintTasks.length}
                {sprintPoints > 0 && <span className="text-muted-text font-normal"> · {sprintPoints} pts</span>})
              </span>
            </CardTitle>
            <p className="text-[11px] text-muted-text">
              Tasks committed to this sprint. Drag one back to the backlog to remove it.
            </p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-text" />
              <Input
                placeholder="Search sprint tasks..."
                value={sprintSearch}
                onChange={(e) => setSprintSearch(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto space-y-2 p-3 relative">
            <DropZone id="sprint-drop" label="Add to sprint">
              {filteredSprint.length === 0 ? (
                <div className="text-center py-8 text-muted-text text-sm">
                  {sprintSearch ? 'No matching tasks' : 'No tasks in sprint'}
                </div>
              ) : (
                filteredSprint.map((task) => (
                  <DraggableTaskCard
                    key={task.id}
                    id={`s-${task.id}`}
                    task={task}
                    readOnly={readOnly}
                    action="remove"
                    onAction={handleRemoveFromSprint}
                    title="Remove from sprint"
                  />
                ))
              )}
            </DropZone>
          </CardContent>
        </Card>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={(e) => {
          const data = e.active.data.current as { task?: Task; panel?: Panel } | undefined
          if (data?.task) setActiveDrag({ task: data.task, panel: (data.panel as Panel) || 'backlog' })
        }}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDrag(null)}
      >
        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay>
              {activeDrag && (
                <Card className="border-hairline shadow-2xl rotate-3 opacity-90 w-[320px]">
                  <CardContent className="p-3">
                    <TaskCardBody task={activeDrag.task} />
                  </CardContent>
                </Card>
              )}
            </DragOverlay>,
            document.body,
          )}
      </DndContext>
    </div>
  )
}
