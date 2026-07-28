'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  getBacklogTasks,
  getSprintDetail,
  assignTaskToSprint,
  removeTaskFromSprint,
  updateSprintCapacity,
  getSprintsByBoard,
} from '@/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, Plus, X, ArrowLeft, User, Layers, Target, GripVertical } from 'lucide-react'

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

export function SprintPlanningBoard({
  sprintId,
  basePath = '/manager',
  readOnly = false,
}: {
  sprintId: string
  basePath?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [sprint, setSprint] = useState<SprintData | null>(null)
  const [backlogTasks, setBacklogTasks] = useState<Task[]>([])
  const [sprintTasks, setSprintTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [backlogSearch, setBacklogSearch] = useState('')
  const [sprintSearch, setSprintSearch] = useState('')
  const [editCapacity, setEditCapacity] = useState(false)
  const [capacityInput, setCapacityInput] = useState('')

  useEffect(() => {
    loadData()
  }, [sprintId])

  async function loadData() {
    setLoading(true)
    const [detailRes] = await Promise.all([getSprintDetail(sprintId)])
    if (detailRes.success) {
      const d = detailRes.data as SprintData
      setSprint(d)
      setSprintTasks(d.tasks || [])
      setCapacityInput(d.capacity?.toString() || '')
    }

    // Load backlog for this sprint's board
    if (sprint?.board?.id) {
      const backlogRes = await getBacklogTasks(sprint.board.id)
      if (backlogRes.success) setBacklogTasks(backlogRes.data || [])
    } else {
      // First load - get sprint first then backlog
      // Already handled in the above
    }

    setLoading(false)
  }

  // When sprint loads, load backlog
  useEffect(() => {
    if (sprint?.board?.id && loading === false) {
      // Already loaded in loadData
    }
  }, [sprint?.board?.id])

  async function handleAddToSprint(taskId: string) {
    const res = await assignTaskToSprint({ taskId, sprintId })
    if (res.success) {
      toast.success('Task added to sprint')
      loadData()
    } else {
      toast.error(res.error || 'Failed to add')
    }
  }

  async function handleRemoveFromSprint(taskId: string) {
    const res = await removeTaskFromSprint({ taskId })
    if (res.success) {
      toast.success('Task removed from sprint')
      loadData()
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
      loadData()
    } else {
      toast.error(res.error || 'Failed to save capacity')
    }
  }

  const filteredBacklog = backlogTasks.filter((t) => {
    if (!backlogSearch) return true
    const q = backlogSearch.toLowerCase()
    return t.title.toLowerCase().includes(q) || (t.description?.toLowerCase() || '').includes(q)
  })

  const filteredSprint = sprintTasks.filter((t) => {
    if (!sprintSearch) return true
    const q = sprintSearch.toLowerCase()
    return t.title.toLowerCase().includes(q) || (t.description?.toLowerCase() || '').includes(q)
  })

  const totalAssigned = sprintTasks.length
  const capacity = sprint?.capacity || 0
  const capacityPct = capacity > 0 ? Math.round((totalAssigned / capacity) * 100) : 0
  const overCapacity = capacity > 0 && totalAssigned > capacity

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
          <h1 className="text-xl font-bold">{sprint.name} — Planning</h1>
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
            <span className="text-sm font-medium">Capacity</span>
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
                  {capacity > 0 ? `${capacity} tasks` : 'Set capacity'}
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
              <span>Backlog ({backlogTasks.length})</span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-text" />
              <Input
                placeholder="Search backlog..."
                value={backlogSearch}
                onChange={(e) => setBacklogSearch(e.target.value)}
                className="pl-10 h-9 text-sm"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto space-y-2 p-3">
            {filteredBacklog.length === 0 ? (
              <div className="text-center py-8 text-muted-text text-sm">
                {backlogSearch ? 'No matching tasks' : 'Backlog is empty'}
              </div>
            ) : (
              filteredBacklog.map((task) => (
                <Card key={task.id} className="border-hairline group hover:border-accent/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-text/30 mt-0.5 shrink-0" />
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
                          {task.storyPoints && (
                            <Badge variant="outline" className="text-[9px] font-mono px-1.5">
                              {task.storyPoints} pts
                            </Badge>
                          )}
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
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleAddToSprint(task.id)}
                          title="Add to sprint"
                        >
                          <Plus className="h-4 w-4 text-accent" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right: Sprint Tasks */}
        <Card className="border-hairline">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Sprint Tasks ({sprintTasks.length})</span>
            </CardTitle>
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
          <CardContent className="max-h-[600px] overflow-y-auto space-y-2 p-3">
            {filteredSprint.length === 0 ? (
              <div className="text-center py-8 text-muted-text text-sm">
                {sprintSearch ? 'No matching tasks' : 'No tasks in sprint'}
              </div>
            ) : (
              filteredSprint.map((task) => (
                <Card key={task.id} className="border-hairline group hover:border-accent/30 transition-colors">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <GripVertical className="h-4 w-4 text-muted-text/30 mt-0.5 shrink-0" />
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
                          {task.storyPoints && (
                            <Badge variant="outline" className="text-[9px] font-mono px-1.5">
                              {task.storyPoints} pts
                            </Badge>
                          )}
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
                      {!readOnly && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                          onClick={() => handleRemoveFromSprint(task.id)}
                          title="Remove from sprint"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
