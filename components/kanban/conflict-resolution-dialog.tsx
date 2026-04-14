'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Zap } from 'lucide-react'

interface ConflictResolutionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSync: () => void
  onForceOverwrite?: () => void
  isManager?: boolean
}

export function ConflictResolutionDialog({
  open,
  onOpenChange,
  onSync,
  onForceOverwrite,
  isManager = false,
}: ConflictResolutionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[24px] max-w-md">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-display-hero group-hover:text-primary transition-colors text-center font-waldenburg font-normal">
            Version Conflict Detect
          </DialogTitle>
          <DialogDescription className="text-center text-body-standard text-[#777169] pt-2">
            This task was modified by another team member while you were viewing it. To prevent data loss, you must resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <div className="p-4 bg-[rgba(0,0,0,0.02)] border border-[rgba(0,0,0,0.05)] rounded-[16px]">
            <p className="text-caption font-medium mb-1">Recommended Action</p>
            <p className="text-body-standard text-[#777169]">
              Refresh the task data to see the latest changes before reapplying your update.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button 
            className="w-full h-12 rounded-[12px] gap-2" 
            onClick={onSync}
          >
            <RefreshCw className="h-4 w-4" />
            Sync with Server
          </Button>
          
          {isManager && (
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-[12px] gap-2 border-amber-200 text-amber-700 hover:bg-amber-50" 
              onClick={onForceOverwrite}
            >
              <Zap className="h-4 w-4" />
              Force Overwrite (Manager)
            </Button>
          )}
          
          <Button 
            variant="ghost" 
            className="w-full h-10 rounded-[12px] font-waldenburg text-micro" 
            onClick={() => onOpenChange(false)}
          >
            Cancel and Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
