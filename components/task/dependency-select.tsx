'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Task } from '@/lib/slices/boardsApi'
import { toast } from 'sonner'

interface DependencySelectProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  availableTasks: Task[]
  onAddDependency: (blockerId: string) => Promise<void>
}

export default function DependencySelectDialog({
  open,
  onOpenChange,
  task,
  availableTasks,
  onAddDependency,
}: DependencySelectProps) {
  const [selectedBlockerId, setSelectedBlockerId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // Filter out current task and existing blockers
  const existingBlockerIds = new Set(
    (task.blockers || []).map((b: any) => b.blocker?.id).filter(Boolean)
  )

  const availableBlockers = availableTasks.filter(
    (t) => t.id !== task.id && !existingBlockerIds.has(t.id) && t.columnId !== task.columnId
  )

  const handleAdd = async () => {
    if (!selectedBlockerId) {
      toast.error('Please select a task to block this one')
      return
    }

    setIsAdding(true)
    try {
      await onAddDependency(selectedBlockerId)
      setSelectedBlockerId('')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to add dependency')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[20px]">
        <DialogHeader>
          <DialogTitle className="text-section-heading font-waldenburg font-light">
            Add Blocking Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-body-standard text-[#777169]">
            Select a task that must be completed before <strong>{task.title}</strong> can be moved to Done.
          </p>

          <div className="space-y-2">
            <Label className="text-caption">Blocking Task</Label>
            <Select value={selectedBlockerId} onValueChange={setSelectedBlockerId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a task..." />
              </SelectTrigger>
              <SelectContent>
                {availableBlockers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title} ({t.column?.name || 'No column'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableBlockers.length === 0 && (
            <p className="text-caption text-[#777169]">
              No available tasks. Tasks must be in different columns.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedBlockerId || isAdding}>
            {isAdding ? 'Adding...' : 'Add Dependency'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
