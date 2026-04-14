'use client'

import { useAppDispatch, useAppSelector } from '@/lib/hooks'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { X } from 'lucide-react'
import { setRightSidebarOpen, setSelectedTask } from '@/lib/slices/uiSlice'
import TaskDetailSidebar from '@/components/task/task-detail-sidebar'
import { cn } from '@/lib/utils/cn'

export default function RightSidebar() {
  const dispatch = useAppDispatch()
  const selectedTaskId = useAppSelector((state) => state.ui.selectedTaskId)
  const isOpen = useAppSelector((state) => state.ui.rightSidebarOpen)

  const handleClose = () => {
    dispatch(setSelectedTask(null))
    dispatch(setRightSidebarOpen(false))
  }

  if (!isOpen) return null

  return (
    <div className={cn(
      "fixed top-0 right-0 w-[450px] border-l bg-white h-screen z-50 flex flex-col shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)]",
      "animate-in slide-in-from-right duration-300 ease-out"
    )}>
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-6 sticky top-0 bg-white/80 backdrop-blur-md z-20">
        <div className="flex flex-col">
          <h2 className="font-bold text-lg tracking-tight text-slate-900">
            {selectedTaskId ? 'Task Details' : 'Board Settings'}
          </h2>
          {selectedTaskId && (
             <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Workspace / Board / Task</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 hover:bg-slate-100 transition-colors"
          onClick={handleClose}
        >
          <X className="h-5 w-5 text-slate-500" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        {selectedTaskId ? (
          <TaskDetailSidebar taskId={selectedTaskId} />
        ) : (
          <ScrollArea className="h-full">
            <div className="p-10 space-y-6 flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                 <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                    <div className="w-6 h-6 rounded bg-primary/20 animate-pulse" />
                 </div>
              </div>
              <div className="space-y-2 max-w-[280px]">
                <h3 className="text-base font-semibold text-slate-800">No Task Selected</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Select a task from the board to view and edit its details, manage dependencies, or add comments.
                </p>
              </div>
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
