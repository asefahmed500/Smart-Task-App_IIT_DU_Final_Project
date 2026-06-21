'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSprintsByBoard, createSprint, updateSprintStatus, deleteSprint } from '@/actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Trash2,
  ArrowRight,
  Target,
  Clock,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PLANNED: {
    label: 'Planned',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: <Clock className="h-3 w-3" />,
  },
  ACTIVE: {
    label: 'Active',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    icon: <Play className="h-3 w-3" />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: <XCircle className="h-3 w-3" />,
  },
}

interface Sprint {
  id: string
  name: string
  goal: string | null
  startDate: string
  endDate: string
  status: string
  _count: { tasks: number }
}

interface Board {
  id: string
  name: string
}

export function SprintList({
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
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Sprint | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    goal: '',
    startDate: '',
    endDate: '',
  })
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadSprints()
  }, [boardId])

  async function loadSprints() {
    setLoading(true)
    const res = await getSprintsByBoard(boardId)
    if (res.success) setSprints(res.data || [])
    setLoading(false)
  }

  async function handleCreate() {
    const res = await createSprint({
      ...createForm,
      boardId,
    })
    if (res.success) {
      toast.success('Sprint created')
      setCreateOpen(false)
      setCreateForm({ name: '', goal: '', startDate: '', endDate: '' })
      loadSprints()
    } else {
      toast.error(res.error || 'Failed to create sprint')
    }
  }

  async function handleStatusChange(sprintId: string, newStatus: string) {
    const res = await updateSprintStatus({ id: sprintId, status: newStatus })
    if (res.success) {
      toast.success(`Sprint ${newStatus.toLowerCase()}`)
      loadSprints()
    } else {
      toast.error(res.error || 'Failed to update status')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await deleteSprint(deleteTarget.id)
    if (res.success) {
      toast.success('Sprint deleted')
      setDeleteTarget(null)
      loadSprints()
    } else {
      toast.error(res.error || 'Failed to delete')
    }
  }

  function getDuration(startDate: string, endDate: string): string {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return `${days} day${days !== 1 ? 's' : ''}`
  }

  const filteredSprints =
    statusFilter === 'all'
      ? sprints
      : sprints.filter((s) => s.status === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <CalendarDays className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading sprints...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sprints</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {sprints.length} sprint{sprints.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {boards.length > 1 && (
            <Select
              value={boardId}
              onValueChange={(v) => router.push(`${basePath}/sprints?boardId=${v}`)}
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
          <Button variant="outline" size="sm" onClick={() => router.push(`${basePath}/backlog?boardId=${boardId}`)}>
            Backlog
          </Button>
          {!readOnly && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Sprint
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sprints</SelectItem>
            <SelectItem value="PLANNED">Planned</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredSprints.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No sprints found</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
              {sprints.length === 0
                ? 'Create your first sprint to start planning work.'
                : 'No sprints match the selected filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSprints.map((sprint) => {
            const config = STATUS_CONFIG[sprint.status] || STATUS_CONFIG.PLANNED
            return (
              <Card key={sprint.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{sprint.name}</CardTitle>
                    <Badge variant="secondary" className={config.color}>
                      <span className="flex items-center gap-1">
                        {config.icon}
                        {config.label}
                      </span>
                    </Badge>
                  </div>
                  {sprint.goal && (
                    <CardDescription className="line-clamp-2 mt-1">
                      <Target className="h-3 w-3 inline mr-1" />
                      {sprint.goal}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {new Date(sprint.startDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(sprint.endDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <ArrowRight className="h-4 w-4 shrink-0" />
                      <span>{sprint._count.tasks} task{sprint._count.tasks !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0" />
                      <span>{getDuration(sprint.startDate, sprint.endDate)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 flex-wrap pt-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.push(`${basePath}/sprints/${sprint.id}`)}
                  >
                    View Details
                  </Button>
                  {!readOnly && sprint.status === 'PLANNED' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStatusChange(sprint.id, 'ACTIVE')}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                  )}
                  {!readOnly && sprint.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleStatusChange(sprint.id, 'COMPLETED')}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Button>
                  )}
                  {!readOnly && sprint.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(sprint.id, 'CANCELLED')}
                    >
                      <XCircle className="h-3 w-3" />
                    </Button>
                  )}
                  {!readOnly && (sprint.status === 'PLANNED' || sprint.status === 'CANCELLED') && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(sprint)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  {!readOnly && sprint.status === 'CANCELLED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(sprint.id, 'PLANNED')}
                    >
                      Reopen
                    </Button>
                  )}
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Sprint Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-primary/10">
          <DialogHeader>
            <DialogTitle className="font-oswald uppercase tracking-wider text-xl">Create Sprint</DialogTitle>
            <DialogDescription className="sr-only">
              Set up a new sprint with a goal and timeframe
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Sprint Name</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Sprint 1, Sprint 2"
                className="bg-background/50 border-primary/10 focus:border-primary/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Goal (Optional)</Label>
              <Textarea
                value={createForm.goal}
                onChange={(e) => setCreateForm((f) => ({ ...f, goal: e.target.value }))}
                placeholder="What do you want to achieve this sprint?"
                className="bg-background/50 border-primary/10 focus:border-primary/30 min-h-[100px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={createForm.startDate}
                  onChange={(e) => setCreateForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="bg-background/50 border-primary/10 focus:border-primary/30 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-muted-foreground" />
                  End Date
                </Label>
                <Input
                  type="date"
                  value={createForm.endDate}
                  min={createForm.startDate || undefined}
                  onChange={(e) => setCreateForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="bg-background/50 border-primary/10 focus:border-primary/30 text-sm"
                />
              </div>
            </div>
            {createForm.startDate && createForm.endDate &&
              new Date(createForm.endDate) <= new Date(createForm.startDate) && (
                <p className="text-sm text-destructive">
                  End date must be after the start date.
                </p>
              )}
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !createForm.name ||
                !createForm.startDate ||
                !createForm.endDate ||
                new Date(createForm.endDate) <= new Date(createForm.startDate)
              }
            >
              Create Sprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sprint</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
