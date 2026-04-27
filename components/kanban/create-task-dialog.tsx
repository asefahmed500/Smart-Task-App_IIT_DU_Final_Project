'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useCreateTaskMutation } from '@/lib/slices/tasksApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { toast } from 'sonner'
import { Plus, X, Calendar } from 'lucide-react'
import type { Column } from '@/lib/slices/boardsApi'

interface BoardMember {
  userId: string
  user: {
    id: string
    name: string | null
    email: string | null
    avatar: string | null
  }
}

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
  column: Column
  boardMembers?: BoardMember[]
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
const PRIORITY_COLORS = {
  LOW: 'bg-primary/10 text-primary',
  MEDIUM: 'bg-secondary/10 text-secondary-foreground',
  HIGH: 'bg-accent/10 text-accent-foreground',
  CRITICAL: 'bg-destructive/10 text-destructive',
}

export default function CreateTaskDialog({
  open,
  onOpenChange,
  boardId,
  column,
  boardMembers = [],
}: CreateTaskDialogProps) {
  const { data: session } = useGetSessionQuery()
  const [createTask, { isLoading }] = useCreateTaskMutation()
  const userRole = session?.role
  const userId = session?.id

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as (typeof PRIORITIES)[number],
    assigneeId: userRole === 'MEMBER' ? (userId || 'unassigned') : 'unassigned',
    dueDate: '',
    labelInput: '',
    labels: [] as string[],
  })

  const handleAddLabel = () => {
    const label = form.labelInput.trim()
    if (label && !form.labels.includes(label)) {
      setForm((f) => ({ ...f, labels: [...f.labels, label], labelInput: '' }))
    }
  }

  const handleRemoveLabel = (label: string) => {
    setForm((f) => ({ ...f, labels: f.labels.filter((l) => l !== label) }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      toast.error('Task title is required')
      return
    }

    try {
      await createTask({
        boardId,
        data: {
          columnId: column.id,
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          priority: form.priority,
          assigneeId: form.assigneeId === 'unassigned' ? undefined : form.assigneeId,
          dueDate: form.dueDate || undefined,
          labels: form.labels,
        }
      }).unwrap()

      toast.success(`Task "${form.title}" created`)
      setForm({ title: '', description: '', priority: 'MEDIUM', assigneeId: userRole === 'MEMBER' ? (userId || 'unassigned') : 'unassigned', dueDate: '', labelInput: '', labels: [] })
      onOpenChange(false)
    } catch (error: unknown) {
      const apiError = error as { data?: { error?: string; wipLimit?: number } }
      if (apiError?.data?.error === 'WIP limit exceeded') {
        toast.error(`WIP limit reached: max ${apiError.data.wipLimit} tasks in "${column.name}"`)
      } else {
        toast.error(apiError?.data?.error || 'Failed to create task')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            New Task in <span className="text-primary">{column.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title <span className="text-destructive">*</span></Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Add more details..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Priority + Assignee row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v as (typeof PRIORITIES)[number] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[p]}`}>
                        {p}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>
                Assignee
                {userRole === 'MEMBER' && (
                  <span className="text-xs text-muted-foreground ml-1">(self only)</span>
                )}
              </Label>
              {userRole === 'MEMBER' ? (
                <Input value={session?.name || 'Me'} disabled className="bg-muted/50" />
              ) : (
                <Select
                  value={form.assigneeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {boardMembers.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.user.name || m.user.email || m.userId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <Label htmlFor="task-due" className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Due Date
            </Label>
            <Input
              id="task-due"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>

          {/* Labels */}
          <div className="space-y-1.5">
            <Label>Labels</Label>
            <div className="flex gap-2">
              <Input
                value={form.labelInput}
                onChange={(e) => setForm((f) => ({ ...f, labelInput: e.target.value }))}
                placeholder="Add label..."
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLabel())}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddLabel}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {form.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.labels.map((label) => (
                  <Badge key={label} variant="secondary" className="gap-1 text-xs">
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
