'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getEpicsByBoard, createEpic, updateEpic, deleteEpic } from '@/actions'
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
import { Plus, Trash2, Layers, Edit2 } from 'lucide-react'

const EPIC_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  BACKLOG: { label: 'Backlog', color: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
}

interface Epic {
  id: string
  name: string
  description: string | null
  status: string
  color: string
  _count: { tasks: number }
}

interface Board {
  id: string
  name: string
}

export function EpicList({
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
  const [epics, setEpics] = useState<Epic[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Epic | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Epic | null>(null)
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    color: '#6366F1',
  })
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    color: '#6366F1',
    status: 'BACKLOG',
  })
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadEpics()
  }, [boardId])

  async function loadEpics() {
    setLoading(true)
    const res = await getEpicsByBoard(boardId)
    if (res.success) setEpics(res.data || [])
    setLoading(false)
  }

  async function handleCreate() {
    const res = await createEpic({
      ...createForm,
      boardId,
    })
    if (res.success) {
      toast.success('Epic created')
      setCreateOpen(false)
      setCreateForm({ name: '', description: '', color: '#6366F1' })
      loadEpics()
    } else {
      toast.error(res.error || 'Failed to create epic')
    }
  }

  async function handleEdit() {
    if (!editTarget) return
    const res = await updateEpic({
      id: editTarget.id,
      name: editForm.name,
      description: editForm.description,
      color: editForm.color,
      status: editForm.status as 'BACKLOG' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
    })
    if (res.success) {
      toast.success('Epic updated')
      setEditTarget(null)
      loadEpics()
    } else {
      toast.error(res.error || 'Failed to update')
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const res = await deleteEpic(deleteTarget.id)
    if (res.success) {
      toast.success('Epic deleted')
      setDeleteTarget(null)
      loadEpics()
    } else {
      toast.error(res.error || 'Failed to delete')
    }
  }

  function openEdit(epic: Epic) {
    setEditTarget(epic)
    setEditForm({
      name: epic.name,
      description: epic.description || '',
      color: epic.color,
      status: epic.status,
    })
  }

  const filteredEpics =
    statusFilter === 'all'
      ? epics
      : epics.filter((e) => e.status === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Layers className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Loading epics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Epics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {epics.length} epic{epics.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {boards.length > 1 && (
            <Select
              value={boardId}
              onValueChange={(v) => router.push(`${basePath}/epics?boardId=${v}`)}
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
          {!readOnly && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Epic
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
            <SelectItem value="all">All Epics</SelectItem>
            <SelectItem value="BACKLOG">Backlog</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredEpics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Layers className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold">No epics found</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
              {epics.length === 0
                ? 'Create epics to group related tasks and stories.'
                : 'No epics match the selected filter.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEpics.map((epic) => {
            const config = EPIC_STATUS_CONFIG[epic.status] || EPIC_STATUS_CONFIG.BACKLOG
            return (
              <Card key={epic.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-border"
                        style={{ backgroundColor: epic.color }}
                      />
                      <CardTitle className="text-base">{epic.name}</CardTitle>
                    </div>
                    <Badge variant="secondary" className={config.color}>
                      {config.label}
                    </Badge>
                  </div>
                  {epic.description && (
                    <CardDescription className="line-clamp-2 mt-1">
                      {epic.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm text-muted-foreground">
                    {epic._count.tasks} task{epic._count.tasks !== 1 ? 's' : ''}
                  </p>
                </CardContent>
                {!readOnly && (
                  <CardFooter className="flex gap-2 pt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEdit(epic)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(epic)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardFooter>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Epic Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Epic</DialogTitle>
            <DialogDescription>
              Group related tasks under an epic for better organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Epic Name</Label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. User Authentication, Payment System"
              />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What is this epic about?"
                rows={3}
              />
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={createForm.color}
                  onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-10 w-16 p-1"
                />
                <span className="text-sm text-muted-foreground font-mono">
                  {createForm.color}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!createForm.name}>
              Create Epic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Epic Dialog */}
      <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Epic</DialogTitle>
            <DialogDescription>{editTarget?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Epic Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BACKLOG">Backlog</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-10 w-16 p-1"
                />
                <span className="text-sm text-muted-foreground font-mono">
                  {editForm.color}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Epic</DialogTitle>
            <DialogDescription>
              Are you sure? Tasks will be unlinked from the epic but not deleted.
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
