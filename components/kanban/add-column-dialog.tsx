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
import { createColumn } from '@/lib/board-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface AddColumnDialogProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
}

export function AddColumnDialog({ isOpen, onClose, boardId }: AddColumnDialogProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const result = await createColumn({ boardId, name })
      if (!result.success) throw new Error(result.error)
      toast.success('Column added successfully')
      setName('')
      onClose()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add column'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-primary/10">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase tracking-wider text-xl">Add New Column</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Column Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. In Review, QA, Blocked"
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
              Add Column
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
