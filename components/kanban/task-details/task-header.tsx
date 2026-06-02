'use client'

import { useState, useEffect } from 'react'
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Trash2, Layers, X } from 'lucide-react'
import { Task, User, Priority, Epic } from '@/types/kanban'

interface EditingUser {
  id: string
  name: string
  image: string | null
}

interface TaskHeaderProps {
  task: Task
  currentUser: User
  onUpdate: (field: string, value: string | Priority | null) => Promise<void>
  onDelete: () => Promise<void>
  setTask: React.Dispatch<React.SetStateAction<Task | null>>
  editingBy?: EditingUser[]
  boardEpics?: Epic[]
}

export function TaskHeader({ task, currentUser, onUpdate, onDelete, setTask, editingBy, boardEpics = [] }: TaskHeaderProps) {
  const [localTitle, setLocalTitle] = useState(task.title)

  useEffect(() => {
    setLocalTitle(task.title)
  }, [task.title])

  const handleTitleBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const newTitle = e.target.value.trim()
    if (newTitle && newTitle !== task.title) {
      setTask({ ...task, title: newTitle })
      await onUpdate('title', newTitle)
    } else {
      setLocalTitle(task.title)
    }
  }

  const currentEpic = task.epic || boardEpics.find((e) => e.id === task.epicId)

  return (
    <DialogHeader className="p-6 border-b border-primary/5 bg-muted/20">
      <DialogDescription className="sr-only">Task details editor</DialogDescription>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            {task.column?.name || 'No Column'}
          </Badge>
          {currentEpic && (
            <Badge
              className="gap-1.5 pl-2 pr-1.5 py-0.5 text-xs font-medium border-0"
              style={{ backgroundColor: `${currentEpic.color}20`, color: currentEpic.color }}
            >
              <Layers className="size-3" />
              {currentEpic.name}
              <button
                onClick={() => onUpdate('epicId', null)}
                className="ml-0.5 hover:opacity-70 transition-opacity"
              >
                <X className="size-2.5" />
              </button>
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">ID: {task.id.slice(-6).toUpperCase()}</span>
          <span className="text-xs text-muted-foreground">v{task.version}</span>
        </div>
        <div className="flex items-center gap-2">
          {editingBy && editingBy.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <div className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[10px] text-amber-600 font-medium">
                {editingBy.map((u) => u.name).join(', ')} editing
              </span>
            </div>
          )}
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'MANAGER' || task?.creatorId === currentUser?.id || task?.assigneeId === currentUser?.id) && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </div>
      <DialogTitle className="mt-4">
        <Input
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleTitleBlur}
          className="text-2xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 h-auto font-oswald uppercase tracking-tight"
        />
      </DialogTitle>
    </DialogHeader>
  )
}
