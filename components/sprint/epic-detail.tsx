'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getEpicDetail, updateEpic } from '@/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Layers,
  Calendar,
  User,
  Tag,
  MessageSquare,
  Loader2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const EPIC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  BACKLOG: { label: 'Backlog', color: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

interface Task {
  id: string
  title: string
  description: string | null
  priority: string
  status: string | null
  issueType: string | null
  storyPoints: number | null
  column: { id: string; name: string } | null
  assignee: { id: string; name: string | null; image: string | null } | null
  tags: { id: string; name: string; color: string }[]
  _count: { comments: number; attachments: number; checklists: number }
}

interface EpicDetailData {
  id: string
  name: string
  description: string | null
  status: string
  color: string
  boardId: string
  createdAt: string
  updatedAt: string
  tasks: Task[]
  _count: { tasks: number }
}

export function EpicDetail({
  epicId,
  basePath = '/manager',
  readOnly = false,
}: {
  epicId: string
  basePath?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [epic, setEpic] = useState<EpicDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    loadEpic()
  }, [epicId])

  async function loadEpic() {
    setLoading(true)
    const res = await getEpicDetail(epicId)
    if (res.success && res.data) {
      setEpic(res.data as EpicDetailData)
    } else {
      toast.error(res.error || 'Failed to load epic')
    }
    setLoading(false)
  }

  async function handleStatusChange(newStatus: string) {
    if (!epic || readOnly) return
    setUpdating(true)
    const res = await updateEpic({
      id: epic.id,
      name: epic.name,
      description: epic.description || '',
      color: epic.color,
      status: newStatus as 'BACKLOG' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    })
    if (res.success) {
      toast.success('Epic status updated')
      loadEpic()
    } else {
      toast.error(res.error || 'Failed to update status')
    }
    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading epic...</p>
        </div>
      </div>
    )
  }

  if (!epic) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Layers className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold">Epic not found</h3>
        <Button onClick={() => router.push(`${basePath}/epics`)}>
          Back to Epics
        </Button>
      </div>
    )
  }

  const config = EPIC_STATUS_CONFIG[epic.status] || EPIC_STATUS_CONFIG.BACKLOG
  const totalTasks = epic.tasks.length
  const doneTasks = epic.tasks.filter(
    (t) => t.column?.name.toLowerCase() === 'done' || t.status === 'DONE'
  ).length
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  const filteredTasks =
    statusFilter === 'all'
      ? epic.tasks
      : epic.tasks.filter((t) => t.status === statusFilter || t.column?.name === statusFilter)

  const priorityColor: Record<string, string> = {
    LOW: 'bg-blue-500/10 text-blue-500',
    MEDIUM: 'bg-yellow-500/10 text-yellow-500',
    HIGH: 'bg-orange-500/10 text-orange-500',
    URGENT: 'bg-red-500/10 text-red-500',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`${basePath}/epics`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full border-2 border-border"
              style={{ backgroundColor: epic.color }}
            />
            <h1 className="text-2xl font-bold tracking-tight">{epic.name}</h1>
          </div>
        </div>
        {!readOnly && (
          <Select value={epic.status} onValueChange={handleStatusChange} disabled={updating}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BACKLOG">Backlog</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Description */}
      {epic.description && (
        <p className="text-muted-foreground text-sm">{epic.description}</p>
      )}

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className={config.color}>
                {config.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {doneTasks}/{totalTasks} tasks completed
              </span>
            </div>
            <span className="text-lg font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                backgroundColor: epic.color,
                width: `${progress}%`,
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalTasks}</div>
            <p className="text-xs text-muted-foreground">Total Tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-emerald-500">{doneTasks}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-500">
              {epic.tasks.filter((t) => t.status === 'IN_PROGRESS').length}
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-muted-foreground">
              {epic.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Story Points</p>
          </CardContent>
        </Card>
      </div>

      {/* Tasks */}
      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter tasks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="TODO">To Do</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="DONE">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No tasks found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {totalTasks === 0
                ? 'Assign tasks to this epic from the board or backlog.'
                : 'No tasks match the selected filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 ${priorityColor[task.priority] || 'bg-muted'}`}
                      >
                        {task.priority}
                      </Badge>
                      {task.issueType && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {task.issueType}
                        </Badge>
                      )}
                      {task.column && (
                        <span className="text-[10px] text-muted-foreground">
                          {task.column.name}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-sm truncate">{task.title}</h3>
                    {task.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <Avatar className="size-4">
                            <AvatarImage src={task.assignee.image || undefined} />
                            <AvatarFallback className="text-[7px]">
                              {task.assignee.name?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{task.assignee.name}</span>
                        </div>
                      )}
                      {task.storyPoints && (
                        <span>{task.storyPoints} SP</span>
                      )}
                      {task._count.comments > 0 && (
                        <div className="flex items-center gap-1">
                          <MessageSquare className="size-3" />
                          <span>{task._count.comments}</span>
                        </div>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="size-3" />
                          <span>{task.tags.length}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
