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
import { updateColumnWipLimit } from '@/lib/board-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface SetWipLimitDialogProps {
  isOpen: boolean
  onClose: () => void
  columnId: string
  boardId: string
  currentLimit: number
}

export function SetWipLimitDialog({ isOpen, onClose, columnId, boardId, currentLimit }: SetWipLimitDialogProps) {
  const [loading, setLoading] = useState(false)
  const [limit, setLimit] = useState(currentLimit.toString())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const numLimit = parseInt(limit)
    if (isNaN(numLimit) || numLimit < 0) return

    setLoading(true)
    try {
      await updateColumnWipLimit(columnId, numLimit, boardId)
      toast.success('WIP limit updated')
      onClose()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update WIP limit'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[325px] bg-background/95 backdrop-blur-xl border-primary/10">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase tracking-wider text-xl">Set WIP Limit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="limit">WIP Limit (0 for unlimited)</Label>
            <Input
              id="limit"
              type="number"
              min="0"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
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
              Save Limit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
