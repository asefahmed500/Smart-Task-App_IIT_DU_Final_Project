'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateColumnWipLimit, undoLastAction } from '@/actions/board-actions'
import { toast } from 'sonner'
import { Loader2, WifiOff } from 'lucide-react'
import { useOfflineStore } from '@/lib/store/use-offline-store'

interface SetWipLimitDialogProps {
  isOpen: boolean
  onClose: () => void
  columnId: string
  boardId: string
  currentLimit: number
}

export function SetWipLimitDialog({ isOpen, onClose, columnId, boardId, currentLimit }: SetWipLimitDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [limit, setLimit] = useState(currentLimit.toString())
  const { isOnline } = useOfflineStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isOnline) {
      toast.error('WIP limit changes are not available offline')
      return
    }
    const numLimit = parseInt(limit)
    if (isNaN(numLimit) || numLimit < 0) return

    setLoading(true)
    try {
      const result = await updateColumnWipLimit({ columnId, wipLimit: numLimit })
      if (result.success) {
        toast.success('WIP limit updated', {
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
        router.refresh()
        onClose()
      } else {
        toast.error(result.error || 'Failed to update WIP limit')
      }
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
          <DialogDescription className="sr-only">Set work-in-progress limit for this column</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {!isOnline && (
            <div className="flex items-center gap-2 text-xs text-red-500 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
              <WifiOff className="size-3.5" />
              WIP limit changes are not available offline
            </div>
          )}
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
