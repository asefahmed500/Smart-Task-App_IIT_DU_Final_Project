'use client'

import { useMemo } from 'react'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TaskCard } from './task-card'
import { Button } from '@/components/ui/button'
import { Plus, MoreHorizontal, Trash2, Edit2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { deleteColumn, undoLastAction } from '@/lib/board-actions'
import { toast } from 'sonner'
import { AddTaskDialog } from './add-task-dialog'
import { SetWipLimitDialog } from './set-wip-limit-dialog'
import { RenameColumnDialog } from './rename-column-dialog'
import { useState } from 'react'

import { Column, Task, User } from '@/types/kanban'

interface ColumnContainerProps {
  column: Column
  tasks: Task[]
  currentUser: User
  boardId: string
  onTaskClick: (taskId: string) => void
}

export function ColumnContainer({ column, tasks, currentUser, boardId, onTaskClick }: ColumnContainerProps) {
  const tasksIds = useMemo(() => tasks.map((task) => task.id), [tasks])

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  })

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  }

  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false)
  const [isWipLimitOpen, setIsWipLimitOpen] = useState(false)
  const [isRenameOpen, setIsRenameOpen] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this column? Tasks will be moved to another column if available.')) return
    try {
      const result = await deleteColumn({ columnId: column.id, boardId })
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete column')
      }
      toast.success('Column deleted', {
        action: {
          label: 'Undo',
          onClick: async () => {
            const result = await undoLastAction()
            if (result.success) toast.success('Column restored')
            else toast.error(result.error || 'Failed to undo')
          }
        }
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete column'
      toast.error(message)
    }
  }

  const isOverWipLimit = column.wipLimit > 0 && tasks.length > column.wipLimit

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-primary/5 border-2 border-dashed border-primary/20 w-[350px] min-w-[350px] h-full rounded-2xl opacity-40"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col bg-muted/40 backdrop-blur-md border border-primary/5 w-[350px] min-w-[350px] h-full rounded-2xl overflow-hidden shadow-sm group/column",
        isOverWipLimit && "border-red-500/50 bg-red-500/5"
      )}
    >
      {/* Column Header */}
      <div
        {...attributes}
        {...listeners}
        className="p-4 flex items-center justify-between gap-2 border-b border-primary/5 cursor-grab active:cursor-grabbing bg-background/20"
      >
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-primary" />
          <h2 className="font-oswald uppercase tracking-wider text-sm font-bold flex items-center gap-2">
            {column.name}
            <span className={cn(
              "text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-sans tracking-normal",
              isOverWipLimit && "bg-red-500 text-white animate-pulse"
            )}>
              {tasks.length}
              {column.wipLimit > 0 && ` / ${column.wipLimit}`}
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1">
          {isOverWipLimit && (
            <AlertCircle className="size-4 text-red-500" />
          )}
          {currentUser.role !== 'MEMBER' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover/column:opacity-100 transition-opacity">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="gap-2" onClick={() => setIsRenameOpen(true)}>
                  <Edit2 className="size-4" /> Rename Column
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onClick={() => setIsWipLimitOpen(true)}>
                  <AlertCircle className="size-4" /> Set WIP Limit
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2 text-red-500 focus:text-red-500 focus:bg-red-500/10" onClick={handleDelete}>
                  <Trash2 className="size-4" /> Delete Column
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-none">
        <SortableContext items={tasksIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="h-24 border-2 border-dashed border-primary/5 rounded-xl flex items-center justify-center text-muted-foreground/30 text-xs italic">
            No tasks here
          </div>
        )}
      </div>

      {/* Column Footer */}
      <div className="p-3">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all rounded-xl"
          onClick={() => setIsAddTaskOpen(true)}
        >
          <Plus className="size-4" />
          Add Task
        </Button>
      </div>

      <AddTaskDialog 
        isOpen={isAddTaskOpen} 
        onClose={() => setIsAddTaskOpen(false)} 
        columnId={column.id}
        currentUser={currentUser}
      />

      <SetWipLimitDialog
        isOpen={isWipLimitOpen}
        onClose={() => setIsWipLimitOpen(false)}
        columnId={column.id}
        boardId={boardId}
        currentLimit={column.wipLimit}
      />

      <RenameColumnDialog
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        columnId={column.id}
        boardId={boardId}
        currentName={column.name}
      />
    </div>
  )
}
