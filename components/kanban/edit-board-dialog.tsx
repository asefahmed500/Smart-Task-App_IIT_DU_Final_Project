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
import { updateBoard } from '@/lib/board-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface EditBoardDialogProps {
  isOpen: boolean
  onClose: () => void
  board: {
    id: string
    name: string
    description: string | null
  }
}

export function EditBoardDialog({ isOpen, onClose, board }: EditBoardDialogProps) {
  const [name, setName] = useState(board.name)
  const [description, setDescription] = useState(board.description || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const result = await updateBoard({ id: board.id, name, description })
      if (result.success) {
        toast.success('Board updated successfully')
        onClose()
      } else {
        toast.error(result.error || 'Failed to update board')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update board'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-xl border-primary/10">
        <DialogHeader>
          <DialogTitle className="font-oswald uppercase tracking-tight text-2xl">Edit Board Details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Board Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Product Launch"
              className="bg-muted/20 border-primary/5 focus:border-primary/20 h-11"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this board for?"
              className="bg-muted/20 border-primary/5 focus:border-primary/20 min-h-[120px] resize-none"
            />
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose}
              className="font-oswald uppercase tracking-wider text-xs"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !name.trim()}
              className="font-oswald uppercase tracking-wider text-xs px-8"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
