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
import { createBoard } from '@/actions/board-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface CreateBoardDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateBoardDialog({ isOpen, onClose, onSuccess }: CreateBoardDialogProps) {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const result = await createBoard({ name, description: description || undefined })
      if (!result.success) {
        throw new Error(result.error || 'Failed to create board')
      }
      toast.success('Board created successfully')
      setName('')
      setDescription('')
      onSuccess?.()
      onClose()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create board'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-primary/10">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase tracking-wider text-xl">Create New Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Board Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter board name"
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
              placeholder="Add a description..."
              className="bg-background/50 border-primary/10 focus:border-primary/30 min-h-[80px]"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="size-4 animate-spin" />}
              Create Board
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}