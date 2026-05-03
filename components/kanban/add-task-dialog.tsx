'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createTask } from '@/lib/task-actions'
import { toast } from 'sonner'
import { undoLastAction } from '@/lib/board-actions'
import { Loader2 } from 'lucide-react'
import { useOfflineStore } from '@/lib/store/use-offline-store'
import { User } from '@/types/kanban'
import { Priority } from '@/generated/prisma/enums'

interface AddTaskDialogProps {
  isOpen: boolean
  onClose: () => void
  columnId: string
  currentUser: User
}

export function AddTaskDialog({ isOpen, onClose, columnId, currentUser }: AddTaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const { isOnline, addAction } = useOfflineStore()

  const isMember = currentUser.role === 'MEMBER'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      if (!isOnline) {
        await addAction({
          type: 'CREATE_TASK',
          payload: {
            title,
            description,
            priority: priority as Priority,
            columnId,
          }
        })
        toast.success('Task creation queued (offline)')
        setTitle('')
        setDescription('')
        onClose()
        return
      }

      const result = await createTask({
        title,
        description,
        priority: priority as Priority,
        columnId,
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to create task')
      }

      toast.success('Task created successfully', {
        action: {
          label: 'Undo',
          onClick: async () => {
            const undoResult = await undoLastAction()
            if (undoResult.success) {
              toast.success('Task deleted')
            } else {
              toast.error(undoResult.error || 'Failed to undo')
            }
          }
        }
      })
      setTitle('')
      setDescription('')
      onClose()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create task'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-primary/10">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase tracking-wider text-xl">Add New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              required
              className="bg-background/50 border-primary/10 focus:border-primary/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              className="bg-background/50 border-primary/10 focus:border-primary/30 min-h-[100px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="bg-background/50 border-primary/10">
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isMember && (
            <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
              You will be automatically assigned to this task
            </div>
          )}
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
