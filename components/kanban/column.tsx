'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, MoreVertical, GripVertical, AlertTriangle, Trash2, Edit, Hash } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useUpdateColumnMutation, useDeleteColumnMutation } from '@/lib/slices/boardsApi'
import { Column as ColumnType, Task } from '@/lib/slices/boardsApi'
import { cn } from '@/lib/utils'
import { useState, memo } from 'react'
import { toast } from 'sonner'
import CreateTaskDialog from './create-task-dialog'
import DraggableTaskCard from './draggable-task-card'
import { useAppDispatch } from '@/lib/hooks'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { setSelectedTask, setRightSidebarOpen } from '@/lib/slices/uiSlice'

interface ColumnProps {
  column: ColumnType & { _count?: { tasks: number } }
  boardId: string
  tasks: Task[]
  focusMode?: boolean
  filterAssignee?: string | null
  activeId: string | null
}

function ColumnComponent({ column, boardId, tasks = [], focusMode, filterAssignee, activeId }: ColumnProps) {
  const dispatch = useAppDispatch()
  const [updateColumn] = useUpdateColumnMutation()
  const [deleteColumn] = useDeleteColumnMutation()

  // Dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [wipDialogOpen, setWipDialogOpen] = useState(false)
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState(column.name)
  const [newWipLimit, setNewWipLimit] = useState(column.wipLimit?.toString() || '')

  const { data: session } = useGetSessionQuery()
  const userRole = session?.role
  const canManageColumn = userRole === 'MANAGER' || userRole === 'ADMIN'
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  const taskCount = tasks.length
  const wipLimit = column.wipLimit
  const isOverWip = wipLimit && taskCount >= wipLimit
  const wipColor = isOverWip ? 'text-destructive' : taskCount >= wipLimit! * 0.8 ? 'text-amber-500' : 'text-muted-foreground'
  const showWipWarning = isOverWip

  const handleRename = async () => {
    if (!newColumnName.trim()) return
    try {
      await updateColumn({ id: column.id, name: newColumnName }).unwrap()
      toast.success('Column renamed successfully')
      setRenameDialogOpen(false)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to rename column')
    }
  }

  const handleDelete = async () => {
    if (taskCount > 0) {
      toast.error('Cannot delete column with tasks. Please move tasks first.')
      setDeleteDialogOpen(false)
      return
    }
    try {
      await deleteColumn(column.id).unwrap()
      toast.success('Column deleted successfully')
      setDeleteDialogOpen(false)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to delete column')
    }
  }

  const handleUpdateWip = async () => {
    try {
      const wipValue = newWipLimit === '' ? null : parseInt(newWipLimit)
      await updateColumn({ id: column.id, wipLimit: wipValue }).unwrap()
      toast.success('WIP limit updated successfully')
      setWipDialogOpen(false)
    } catch (error: any) {
      toast.error(error.data?.error || 'Failed to update WIP limit')
    }
  }

  const openRenameDialog = () => {
    setNewColumnName(column.name)
    setRenameDialogOpen(true)
  }

  const openWipDialog = () => {
    setNewWipLimit(column.wipLimit?.toString() || '')
    setWipDialogOpen(true)
  }

  return (
    <div className="w-80 flex-shrink-0 flex flex-col h-full">
      <Card className={cn(
        'flex-1 flex flex-col transition-colors',
        isOver && 'bg-accent/50',
        showWipWarning && 'border-amber-500/50'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <CardTitle className="text-sm font-medium truncate">
                {column.name}
              </CardTitle>
              <Badge variant="secondary" className={cn('text-xs', wipColor)}>
                {taskCount}
                {wipLimit && ` / ${wipLimit}`}
              </Badge>
              {showWipWarning && (
                <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
              )}
            </div>
            {canManageColumn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openWipDialog}>
                    <Hash className="mr-2 h-4 w-4" />
                    Edit WIP Limit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openRenameDialog}>
                    <Edit className="mr-2 h-4 w-4" />
                    Rename Column
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {showWipWarning && (
            <p className="text-xs text-amber-500 mt-1">
              WIP limit exceeded - managers can override
            </p>
          )}
        </CardHeader>

        <CardContent className="flex-1 p-4">
          <ScrollArea className="h-full px-2">
            <div
              ref={setNodeRef}
              className={cn(
                'space-y-2 min-h-[200px] rounded-lg transition-colors',
                isOver && 'bg-accent/50 p-2 -m-2',
                isOverWip && activeId && 'animate-shake'
              )}
            >
              <SortableContext
                items={tasks.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {tasks.map((task) => (
                  <DraggableTaskCard
                    key={task.id}
                    task={task}
                    focusMode={focusMode}
                    filterAssignee={filterAssignee}
                    isDragging={activeId === task.id}
                    onClick={() => {
                      dispatch(setSelectedTask(task.id))
                      dispatch(setRightSidebarOpen(true))
                    }}
                  />
                ))}
              </SortableContext>

              {tasks.length === 0 && (
                <div className="h-32 rounded-lg border-2 border-dashed flex items-center justify-center text-muted-foreground text-sm">
                  No tasks
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>

        {userRole && (
          <div className="p-3 pt-0">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent/50 h-8 text-xs font-medium"
              onClick={() => setCreateTaskOpen(true)}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Add Task
            </Button>
          </div>
        )}
      </Card>

      <CreateTaskDialog
        open={createTaskOpen}
        onOpenChange={setCreateTaskOpen}
        boardId={boardId}
        column={column}
        boardMembers={(column as any).board?.members || []}
      />

      {/* Rename Column Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-section-heading font-waldenburg font-light">Rename Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-caption">Column Name</Label>
              <Input
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                placeholder="Enter column name"
                onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRename}>Rename</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit WIP Limit Dialog */}
      <Dialog open={wipDialogOpen} onOpenChange={setWipDialogOpen}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-section-heading font-waldenburg font-light">Edit WIP Limit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-caption">WIP Limit (leave empty for unlimited)</Label>
              <Input
                type="number"
                min="0"
                value={newWipLimit}
                onChange={(e) => setNewWipLimit(e.target.value)}
                placeholder="No limit"
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateWip()}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWipDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateWip}>Update</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Column Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-[20px]">
          <DialogHeader>
            <DialogTitle className="text-section-heading font-waldenburg font-light">Delete Column</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-body-standard">
              Are you sure you want to delete <strong>{column.name}</strong>?
            </p>
            {taskCount > 0 ? (
              <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-caption">
                This column has {taskCount} task{taskCount !== 1 ? 's' : ''}. Please move all tasks to another column before deleting.
              </div>
            ) : (
              <p className="text-caption text-muted-foreground">This action cannot be undone.</p>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={taskCount > 0}
              >
                Delete Column
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Memoize to prevent unnecessary re-renders when parent state changes
// Only re-render when column, tasks, or activeId actually change
export default memo(ColumnComponent, (prev, next) => {
  return (
    prev.column.id === next.column.id &&
    prev.tasks.length === next.tasks.length &&
    prev.tasks.map(t => t.id).join(',') === next.tasks.map(t => t.id).join(',') &&
    prev.tasks.map(t => t.columnId).join(',') === next.tasks.map(t => t.columnId).join(',') &&
    prev.activeId === next.activeId
  )
})
