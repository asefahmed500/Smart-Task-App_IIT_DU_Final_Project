'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getSprintDetail,
  getSprintMetrics,
  getBurndownData,
  updateTaskStatus,
} from '@/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  rectIntersection,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createPortal } from 'react-dom'
import { BurndownChart } from './burndown-chart'
import { TaskDetailsDialog } from '@/components/kanban/task-details-dialog'
import { AddTaskDialog } from '@/components/kanban/add-task-dialog'
import {
  ArrowLeft,
  MessageSquare,
  Target,
  AlertCircle,
  GripVertical,
  Plus,
  ShieldAlert,
  User,
} from 'lucide-react'
import { User as UserType } from '@/types/kanban'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  isBlocked: boolean
  blockerReason: string | null
  version?: number
  assignee: { id: string; name: string | null; image: string | null } | null
  column: { id: string; name: string } | null
  columnId: string
  epic: { id: string; name: string; color: string } | null
  tags: { id: string; name: string; color: string }[]
  _count: { comments: number; attachments: number; checklists: number; subtasks: number }
  createdAt: string
}

interface BoardColumn {
  id: string
  name: string
  order: number
  wipLimit: number
}

interface BoardMember {
  id: string
  name: string | null
  email: string
  image: string | null
}

interface BoardEpic {
  id: string
  name: string
  color: string
  status: string
  _count: { tasks: number }
}

interface CurrentUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: 'ADMIN' | 'MANAGER' | 'MEMBER'
}

// Droppable column container — ensures even empty columns are drop targets
function DroppableColumn({
  columnId,
  children,
}: {
  columnId: string
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${columnId}`,
    data: { type: 'Column', columnId },
  })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-2 space-y-2 transition-colors ${isOver ? 'bg-accent/10 ring-2 ring-accent/30 rounded-lg' : ''}`}
    >
      {children}
    </div>
  )
}

function SprintTaskCard({
  task,
  onClick,
  readOnly,
}: {
  task: SprintTask
  onClick?: () => void
  readOnly?: boolean
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'Task', task },
    disabled: readOnly,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-30 bg-accent/10 border-2 border-dashed border-accent/20 h-[90px] min-h-[90px] rounded-xl"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className="bg-canvas border border-hairline hover:border-accent/30 rounded-xl p-3 cursor-pointer transition-colors group"
    >
      <div className="flex items-start gap-2">
        {!readOnly && (
          <div
            {...attributes}
            {...listeners}
            className="mt-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVertical className="h-4 w-4 text-muted-text" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            {task.issueType && (
              <Badge
                variant="secondary"
                className={`text-[9px] px-1.5 py-0 ${ISSUE_TYPE_COLORS[task.issueType]}`}
              >
                {task.issueType}
              </Badge>
            )}
            <Badge
              variant="secondary"
              className={`text-[9px] px-1.5 py-0 ${PRIORITY_COLORS[task.priority]}`}
            >
              {task.priority}
            </Badge>
            {task.storyPoints && (
              <Badge variant="outline" className="text-[9px] font-mono px-1.5">
                {task.storyPoints} pts
              </Badge>
            )}
            {task.isBlocked && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1.5 py-0 bg-red-100 text-red-700"
              >
                <AlertCircle className="h-2.5 w-2.5 mr-0.5" />
                Blocked
              </Badge>
            )}
            {task.epic && (
              <span
                className="text-[8px] px-1.5 py-0.5 rounded-full font-medium truncate max-w-[80px]"
                style={{
                  backgroundColor: task.epic.color + '15',
                  color: task.epic.color,
                }}
              >
                {task.epic.name}
              </span>
            )}
          </div>
          <h4 className="text-sm font-medium line-clamp-2">{task.title}</h4>
          {task.description && (
            <p className="text-xs text-muted-text mt-0.5 line-clamp-1">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-text">
            {task.assignee ? (
              <Avatar className="size-5">
                {task.assignee.image && <AvatarImage src={task.assignee.image} />}
                <AvatarFallback className="text-[7px] bg-accent/10 text-accent">
                  {task.assignee.name?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="text-[10px] text-muted-text italic">
                Unassigned
              </span>
            )}
            {task._count?.comments > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {task._count.comments}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function SprintKanbanBoard({
  sprintId,
  boardId,
  columns,
  boardMembers,
  boardEpics,
  currentUser,
  basePath = '/manager',
  readOnly = false,
}: {
  sprintId: string
  boardId: string
  columns: BoardColumn[]
  boardMembers: BoardMember[]
  boardEpics: BoardEpic[]
  currentUser: CurrentUser
  basePath?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [sprint, setSprint] = useState<any>(null)
  const [metrics, setMetrics] = useState<any>(null)
  const [burndownData, setBurndownData] = useState<any>(null)
  const [burndownUseStoryPoints, setBurndownUseStoryPoints] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTask, setActiveTask] = useState<any>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [addTaskColumnId, setAddTaskColumnId] = useState<string | null>(null)
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [showBurndown, setShowBurndown] = useState(false)
  const [colTasks, setColTasks] = useState<
    { id: string; name: string; order: number; wipLimit: number; tasks: any[] }[]
  >([])

  const user: UserType = useMemo(
    () => ({
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      image: currentUser.image,
      role: currentUser.role,
    }),
    [currentUser]
  )

  const members: UserType[] = useMemo(
    () =>
      boardMembers.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        image: m.image,
        role: 'MEMBER' as const,
      })),
    [boardMembers]
  )

  useEffect(() => {
    loadData()
  }, [sprintId])

  async function loadData() {
    setLoading(true)
    const [detailRes, metricsRes, burndownRes] = await Promise.all([
      getSprintDetail(sprintId),
      getSprintMetrics(sprintId),
      getBurndownData(sprintId),
    ])
    if (detailRes.success) {
      const data = detailRes.data as any
      setSprint(data)
      rebuildColumns(data)
    }
    if (metricsRes.success) setMetrics(metricsRes.data)
    if (burndownRes.success) {
      // Server now returns { points, useStoryPoints } — don't fabricate units
      const bd = burndownRes.data as {
        points?: { date: string; ideal: number; actual: number }[]
        useStoryPoints?: boolean
      } | null
      setBurndownData(bd?.points || burndownRes.data)
      setBurndownUseStoryPoints(bd?.useStoryPoints ?? false)
    }
    setLoading(false)
  }

  function rebuildColumns(sprintData: any) {
    const taskMap = new Map<string, any[]>()
    if (sprintData?.tasks) {
      sprintData.tasks.forEach((task: any) => {
        const cid = task.column?.id || task.columnId
        if (!taskMap.has(cid)) taskMap.set(cid, [])
        taskMap.get(cid)!.push(task)
      })
    }
    setColTasks(
      columns.map((col) => ({
        ...col,
        tasks: taskMap.get(col.id) || [],
      }))
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  )

  const displayedCols = useMemo(() => {
    if (filterAssignee === 'all') return colTasks
    return colTasks.map((col) => ({
      ...col,
      tasks: col.tasks.filter((t: any) => t.assignee?.id === filterAssignee),
    }))
  }, [colTasks, filterAssignee])

  const allTaskIds = useMemo(
    () => displayedCols.flatMap((c) => c.tasks.map((t: any) => t.id)),
    [displayedCols]
  )

  const uniqueAssignees = useMemo(() => {
    if (!sprint) return []
    const map = new Map<string, { id: string; name: string | null }>()
    sprint.tasks.forEach((t: any) => {
      if (t.assignee) map.set(t.assignee.id, t.assignee)
    })
    return Array.from(map.values())
  }, [sprint])

  function findColumnForTask(taskId: string): string | null {
    for (const col of colTasks) {
      if (col.tasks.some((t: any) => t.id === taskId)) return col.id
    }
    return null
  }

  const handleDragEnd = useCallback(
    async (event: any) => {
      setActiveTask(null)
      const { active, over } = event
      if (!over || active.id === over.id) return
      if (!sprint) return

      const task = sprint.tasks.find((t: any) => t.id === active.id)
      if (!task) return

      let targetColumnId: string | null = null

      // Over a column droppable
      if (over.data.current?.type === 'Column') {
        targetColumnId = over.data.current.columnId as string
      }
      // Over a task — find its column
      else if (over.data.current?.type === 'Task') {
        targetColumnId = findColumnForTask(over.id as string)
      }
      // Fallback: try via task data
      else {
        targetColumnId = findColumnForTask(over.id as string)
      }

      if (!targetColumnId) return
      const targetCol = columns.find((c) => c.id === targetColumnId)
      if (!targetCol) return

      const currentColId = task.column?.id || task.columnId
      if (currentColId === targetColumnId) return

      // Optimistic update
      setColTasks((prev) =>
        prev.map((col) => {
          if (col.id === currentColId) {
            return {
              ...col,
              tasks: col.tasks.filter((t: any) => t.id !== task.id),
            }
          }
          if (col.id === targetColumnId) {
            return {
              ...col,
              tasks: [
                ...col.tasks,
                {
                  ...task,
                  column: {
                    id: targetColumnId,
                    name: targetCol.name,
                  },
                  columnId: targetColumnId,
                },
              ],
            }
          }
          return col
        })
      )

      const res = await updateTaskStatus({
        taskId: task.id,
        columnId: targetColumnId,
        statusName: targetCol.name,
        version: task.version,
      })

      if (res.success) {
        toast.success(`Task moved to ${targetCol.name}`)
      } else {
        toast.error(res.error || 'Failed to move task')
      }
      loadData()
    },
    [sprint, columns]
  )

  const wipViolations = useMemo(() => {
    if (readOnly) return []
    return colTasks
      .filter((col) => col.wipLimit > 0 && col.tasks.length > col.wipLimit)
      .map((col) => col.name)
  }, [colTasks, readOnly])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-hairline border-t-accent mx-auto mb-4" />
          <p className="text-muted-text">Loading sprint board...</p>
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-text text-lg">Sprint not found</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push(`${basePath}/sprints`)}
        >
          Back to Sprints
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`${basePath}/sprints/${sprintId}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{sprint.name}</h1>
            <Badge
              variant="secondary"
              className={
                STATUS_COLORS[sprint.status as string] ||
                'bg-slate-100 text-slate-800'
              }
            >
              {sprint.status}
            </Badge>
          </div>
          {sprint.goal && (
            <p className="text-sm text-muted-text flex items-center gap-1 mt-1">
              <Target className="h-3 w-3" />
              {sprint.goal}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {metrics && (
            <span className="text-xs text-muted-text">
              {metrics.completedTasks}/{metrics.totalTasks} tasks
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setShowBurndown(!showBurndown)}
          >
            {showBurndown ? 'Hide' : 'Show'} Burndown
          </Button>
        </div>
      </div>

      {wipViolations.length > 0 && (
        <div className="flex items-center gap-2 text-xs font-medium text-red-500 bg-red-500/10 px-3 py-1.5 rounded-full border border-red-500/20 w-fit">
          <ShieldAlert className="size-3.5" />
          WIP Limit Violation: {wipViolations.join(', ')}
        </div>
      )}

      {showBurndown && burndownData && burndownData.length > 0 && (
        <Card className="p-4 border-hairline">
          <h3 className="text-sm font-medium mb-3">Burndown</h3>
          <BurndownChart data={burndownData} useStoryPoints={burndownUseStoryPoints} height={200} />
        </Card>
      )}

      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-3 border-hairline">
            <p className="text-xs text-muted-text">Total Tasks</p>
            <p className="text-lg font-bold">{metrics.totalTasks}</p>
          </Card>
          <Card className="p-3 border-hairline">
            <p className="text-xs text-muted-text">Completed</p>
            <p className="text-lg font-bold text-green-600">
              {metrics.completedTasks}
            </p>
          </Card>
          <Card className="p-3 border-hairline">
            <p className="text-xs text-muted-text">Remaining</p>
            <p className="text-lg font-bold">
              {metrics.totalTasks - metrics.completedTasks}
            </p>
          </Card>
          <Card className="p-3 border-hairline">
            <p className="text-xs text-muted-text">Completion</p>
            <p className="text-lg font-bold">{metrics.completionRate}%</p>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Select
          value={filterAssignee}
          onValueChange={setFilterAssignee}
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="All Assignees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {uniqueAssignees.map((u: any) => (
              <SelectItem key={u.id} value={u.id}>
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3" />
                  {u.name || 'Unnamed'}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* --- KANBAN BOARD --- */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={(e) =>
          setActiveTask(e.active.data.current?.task || null)
        }
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[450px]">
          {displayedCols.map((col) => {
            const isOverWip =
              col.wipLimit > 0 && col.tasks.length > col.wipLimit
            return (
              <div
                key={col.id}
                className={`flex flex-col bg-canvas-soft/50 border rounded-xl min-w-[280px] w-[280px] max-h-[700px] ${
                  isOverWip
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-hairline'
                }`}
              >
                <div className="p-3 border-b border-hairline flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`size-2 rounded-full ${
                        isOverWip ? 'bg-red-500' : 'bg-accent'
                      }`}
                    />
                    <h3 className="text-xs font-bold uppercase tracking-wider">
                      {col.name}
                    </h3>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isOverWip
                          ? 'bg-red-500 text-white'
                          : 'bg-accent/10 text-accent'
                      }`}
                    >
                      {col.tasks.length}
                      {col.wipLimit > 0 && ` / ${col.wipLimit}`}
                    </span>
                  </div>
                  {isOverWip && (
                    <AlertCircle className="size-4 text-red-500 shrink-0" />
                  )}
                </div>

                {/* Droppable area for the entire column content */}
                <DroppableColumn columnId={col.id}>
                  <SortableContext
                    items={col.tasks.map((t: any) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {col.tasks.map((task: any) => (
                      <SprintTaskCard
                        key={task.id}
                        task={task}
                        readOnly={readOnly}
                        onClick={() => setSelectedTaskId(task.id)}
                      />
                    ))}
                  </SortableContext>
                  {col.tasks.length === 0 && (
                    <div className="h-24 border-2 border-dashed border-hairline rounded-lg flex items-center justify-center text-xs text-muted-text/50">
                      {readOnly ? 'No tasks' : 'Drop tasks here'}
                    </div>
                  )}
                </DroppableColumn>

                {!readOnly && (
                  <div className="p-2 border-t border-hairline">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start gap-2 text-xs text-muted-text hover:text-accent"
                      onClick={() => setAddTaskColumnId(col.id)}
                    >
                      <Plus className="size-3" />
                      Add Task
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {typeof document !== 'undefined' &&
          createPortal(
            <DragOverlay>
              {activeTask && (
                <div className="rotate-3 opacity-90 shadow-2xl">
                  <SprintTaskCard task={activeTask} readOnly />
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
      </DndContext>

      {selectedTaskId && sprint?.board?.id && (
        <TaskDetailsDialog
          taskId={selectedTaskId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          boardMembers={members}
          currentUser={user}
          editingTasks={{}}
          boardId={boardId}
          boardEpics={boardEpics.map((e: any) => ({
            ...e,
            _count: { tasks: e._count?.tasks || 0 },
            description: null,
            boardId,
            createdAt: '',
            updatedAt: '',
          }))}
        />
      )}

      {addTaskColumnId && (
        <AddTaskDialog
          isOpen={!!addTaskColumnId}
          onClose={() => setAddTaskColumnId(null)}
          columnId={addTaskColumnId}
          currentUser={user}
          boardMembers={members}
        />
      )}
    </div>
  )
}
