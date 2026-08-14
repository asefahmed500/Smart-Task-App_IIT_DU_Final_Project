'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getIssueTrackerData } from '@/actions'
import { isDoneColumn } from '@/utils/column-utils'
import { useRealtimeReload } from '@/components/kanban/socket-hooks'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  Bug,
  Ban,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  ExternalLink,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const ISSUE_TYPE_COLORS: Record<string, string> = {
  BUG: 'bg-red-100 text-red-800',
  FEATURE: 'bg-emerald-100 text-emerald-800',
  STORY: 'bg-blue-100 text-blue-800',
  TASK: 'bg-slate-100 text-slate-800',
  EPIC: 'bg-purple-100 text-purple-800',
  SUBTASK: 'bg-amber-100 text-amber-800',
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
}

const RESOLUTION_COLORS: Record<string, string> = {
  FIXED: 'bg-emerald-100 text-emerald-700',
  WONT_FIX: 'bg-slate-100 text-slate-700',
  DUPLICATE: 'bg-slate-100 text-slate-700',
  CANNOT_REPRODUCE: 'bg-slate-100 text-slate-700',
  LATER: 'bg-amber-100 text-amber-700',
  MOVED: 'bg-blue-100 text-blue-700',
}

interface TrackerTask {
  id: string
  title: string
  description: string | null
  priority: string
  issueType: string | null
  resolution: string | null
  isBlocked: boolean
  blockerReason: string | null
  dueDate: Date | string | null
  updatedAt: Date | string
  assignee: { id: string; name: string | null; image: string | null } | null
  column: { id: string; name: string; boardId: string } | null
  sprint: { id: string; name: string; status: string } | null
}

interface Board {
  id: string
  name: string
}

type StatusFilter = 'all' | 'open' | 'blocked' | 'overdue' | 'resolved'

export function IssueTracker({
  boards: initialBoards,
  currentUser,
}: {
  boards: Board[]
  currentUser?: { id: string; name: string | null; image: string | null }
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<TrackerTask[]>([])
  const [boards, setBoards] = useState<Board[]>(initialBoards)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterBoard, setFilterBoard] = useState('all')

  async function loadData() {
    setLoading(true)
    const res = await getIssueTrackerData()
    if (res.success && res.data) {
      const data = res.data as { tasks: TrackerTask[]; boards: Board[] }
      setTasks(data.tasks)
      setBoards(data.boards)
    } else {
      toast.error(res.error || 'Failed to load issues')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtimeReload(
    filterBoard === 'all' ? boards[0]?.id : filterBoard,
    currentUser,
    [
      'task:created',
      'task:updated',
      'task:deleted',
      'task:moved',
      'task:issueFieldsUpdated',
      'task:blockerToggled',
    ],
    () => loadData(),
  )

  const boardNameById = useMemo(
    () => new Map(boards.map((b) => [b.id, b.name])),
    [boards],
  )

  const now = new Date()

  const stats = useMemo(() => {
    let open = 0
    let blocked = 0
    let overdue = 0
    let bugs = 0
    let resolved = 0
    for (const t of tasks) {
      const done = isDoneColumn(t.column?.name || '')
      if (done) {
        resolved++
        continue
      }
      open++
      if (t.isBlocked) blocked++
      if (t.dueDate && new Date(t.dueDate) < now) overdue++
      if (t.issueType === 'BUG') bugs++
    }
    return { open, blocked, overdue, bugs, resolved }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !searchQuery ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      const matchesType = filterType === 'all' || task.issueType === filterType
      const matchesPriority =
        filterPriority === 'all' || task.priority === filterPriority
      const matchesBoard = filterBoard === 'all' || task.column?.boardId === filterBoard

      const done = isDoneColumn(task.column?.name || '')
      const isOverdue = !done && !!task.dueDate && new Date(task.dueDate) < now
      let matchesStatus = true
      if (filterStatus === 'open') matchesStatus = !done
      else if (filterStatus === 'blocked') matchesStatus = task.isBlocked
      else if (filterStatus === 'overdue') matchesStatus = isOverdue
      else if (filterStatus === 'resolved') matchesStatus = done

      return matchesSearch && matchesType && matchesPriority && matchesBoard && matchesStatus
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, searchQuery, filterType, filterPriority, filterBoard, filterStatus])

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <GitBranch className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading issues...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Issue Tracker</h1>
          <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
            <Bug className="h-3.5 w-3.5" />
            {boards.length} board{boards.length !== 1 ? 's' : ''} · {stats.open} open · {stats.resolved} resolved
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadData()}>
          Refresh
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <GitBranch className="size-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Open</span>
            </div>
            <p className="text-2xl font-semibold mt-1">{stats.open}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-red-500">
              <Bug className="size-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Bugs</span>
            </div>
            <p className="text-2xl font-semibold mt-1">{stats.bugs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-orange-500">
              <Ban className="size-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Blocked</span>
            </div>
            <p className="text-2xl font-semibold mt-1">{stats.blocked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="size-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Overdue</span>
            </div>
            <p className="text-2xl font-semibold mt-1">{stats.overdue}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="size-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Resolved</span>
            </div>
            <p className="text-2xl font-semibold mt-1">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
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
        {boards.length > 1 && (
          <Select value={filterBoard} onValueChange={setFilterBoard}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Board" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Boards</SelectItem>
              {boards.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Issue list */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bug className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold mt-4">No issues found</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Try adjusting the filters, or create tasks with an issue type on a board.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => {
            const done = isDoneColumn(task.column?.name || '')
            const isOverdue = !done && !!task.dueDate && new Date(task.dueDate) < now
            return (
              <Card key={task.id} className="py-0">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1.5 min-w-0">
                    {task.issueType ? (
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1.5 ${ISSUE_TYPE_COLORS[task.issueType] || 'bg-muted text-muted-foreground'}`}
                      >
                        {task.issueType}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px] px-1.5 bg-muted text-muted-foreground">
                        UNSET
                      </Badge>
                    )}
                    {task.resolution && (
                      <Badge
                        variant="secondary"
                        className={`text-[8px] px-1 ${RESOLUTION_COLORS[task.resolution] || 'bg-muted text-muted-foreground'}`}
                      >
                        {task.resolution.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium truncate">{task.title}</span>
                      {task.isBlocked && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 bg-orange-100 text-orange-800">
                          <Ban className="size-2.5 mr-0.5" />
                          BLOCKED
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 bg-red-100 text-red-800">
                          <AlertTriangle className="size-2.5 mr-0.5" />
                          OVERDUE
                        </Badge>
                      )}
                      {done && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="size-2.5 mr-0.5" />
                          {task.column?.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      <span>
                        {boardNameById.get(task.column?.boardId || '') || 'Board'}
                        {task.column && !done ? ` · ${task.column.name}` : ''}
                      </span>
                      {task.sprint && <span>· Sprint: {task.sprint.name}</span>}
                      {task.blockerReason && (
                        <span className="text-orange-600 truncate max-w-[240px]">
                          · {task.blockerReason}
                        </span>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="secondary"
                    className={`text-[9px] uppercase shrink-0 ${PRIORITY_COLORS[task.priority] || 'bg-muted text-muted-foreground'}`}
                  >
                    {task.priority}
                  </Badge>

                  {task.assignee ? (
                    <Avatar className="size-6 shrink-0">
                      <AvatarImage src={task.assignee.image || undefined} alt={task.assignee.name || ''} />
                      <AvatarFallback className="text-[9px]">
                        {(task.assignee.name || '?').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="size-6 shrink-0" />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-8 px-2"
                    onClick={() =>
                      router.push(`/dashboard/board/${task.column?.boardId}`)
                    }
                    title="Open board"
                  >
                    <ExternalLink className="size-3.5" />
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
