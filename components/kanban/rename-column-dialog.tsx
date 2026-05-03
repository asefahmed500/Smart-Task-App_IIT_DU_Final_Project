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
import { updateColumn, undoLastAction } from '@/actions/board-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface RenameColumnDialogProps {
  isOpen: boolean
  onClose: () => void
  columnId: string
  boardId: string
  currentName: string
}

export function RenameColumnDialog({ isOpen, onClose, columnId, boardId, currentName }: RenameColumnDialogProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(currentName)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const result = await updateColumn({ id: columnId, name })
      if (result.success) {
        toast.success('Column renamed', {
          action: {
            label: 'Undo',
            onClick: async () => {
              const undoResult = await undoLastAction()
              if (undoResult.success) {
                toast.success('Action undone')
              } else {
                toast.error(undoResult.error || 'Failed to undo')
              }
            }
          }
        })
        onClose()
      } else {
        toast.error(result.error || 'Failed to rename column')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to rename column'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-primary/10">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase tracking-wider text-xl">Rename Column</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">New Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Done, Completed, Finished"
              required
              className="bg-background/50 border-primary/10 focus:border-primary/30"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
