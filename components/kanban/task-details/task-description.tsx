'use client'

import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MessageSquare } from 'lucide-react'
import { Task, Priority } from '@/types/kanban'

interface TaskDescriptionProps {
  task: Task
  setTask: React.Dispatch<React.SetStateAction<Task | null>>
  onUpdate: (field: string, value: string | Priority | null) => Promise<void>
}

export function TaskDescription({ task, setTask, onUpdate }: TaskDescriptionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <MessageSquare className="size-4" />
        Description
      </div>
      <Textarea
        value={task.description || ''}
        onChange={(e) => setTask({ ...task, description: e.target.value })}
        onBlur={(e) => onUpdate('description', e.target.value)}
        placeholder="Add a detailed description..."
        className="min-h-[150px] bg-muted/20 border-primary/5 focus:border-primary/20 resize-none transition-all focus:bg-background"
      />
    </section>
  )
}
