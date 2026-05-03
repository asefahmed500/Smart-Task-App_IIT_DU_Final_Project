'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Save } from "lucide-react"

interface ConflictDialogProps {
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
  onResolve: () => void
}

export function ConflictDialog({ isOpen, onClose, onRefresh, onResolve }: ConflictDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] border-amber-500/20 bg-amber-50/5 dark:bg-amber-950/5 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="size-5" />
            Conflict Detected
          </DialogTitle>
          <DialogDescription className="pt-2 text-foreground/80">
            This task has been updated by another user while you were editing it. 
            To prevent data loss, please choose how to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
            <strong>Refresh:</strong> Discard your current changes and load the latest version from the server.
          </div>
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary/80">
            <strong>Overwrite:</strong> Force your changes to be saved, overwriting the other user&apos;s updates (use with caution).
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onRefresh}
            className="flex-1 gap-2 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-600"
          >
            <RefreshCw className="size-4" />
            Refresh Data
          </Button>
          <Button 
            onClick={onResolve}
            className="flex-1 gap-2"
          >
            <Save className="size-4" />
            Overwrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
