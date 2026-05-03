'use client'

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Clock, 
  Tag as TagIcon, 
  X, 
  Plus, 
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { Task, User, Tag, Priority } from '@/types/kanban'
import { cn } from '@/utils/utils'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface TaskSidebarProps {
  task: Task
  currentUser: User
  eligibleAssignees: User[]
  boardTags: Tag[]
  onUpdate: (field: string, value: string | Priority | null) => Promise<void>
  onAddTag: (tagId: string) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
}

export function TaskSidebar({
  task,
  currentUser,
  eligibleAssignees,
  boardTags,
  onUpdate,
  onAddTag,
  onRemoveTag
}: TaskSidebarProps) {
  const isMember = currentUser.role === 'MEMBER'
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-500 bg-red-500/10 border-red-500/20'
      case 'HIGH': return 'text-orange-500 bg-orange-500/10 border-orange-500/20'
      case 'MEDIUM': return 'text-blue-500 bg-blue-500/10 border-blue-500/20'
      case 'LOW': return 'text-green-500 bg-green-500/10 border-green-500/20'
      default: return 'text-muted-foreground bg-muted'
    }
  }

  return (
    <aside className="space-y-8 h-full pr-1">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-bold">
            <UserIcon className="size-3" />
            Assignee
          </Label>
          <Select 
            value={task.assigneeId || 'unassigned'} 
            onValueChange={(val) => onUpdate('assigneeId', val === 'unassigned' ? null : val)}
          >
            <SelectTrigger className="h-10 bg-muted/20 border-primary/5 hover:border-primary/20 transition-all focus:ring-0">
              <SelectValue placeholder="Unassigned">
                {task.assignee && (
                  <div className="flex items-center gap-2">
                    <Avatar className="size-5 border border-primary/10">
                      <AvatarImage src={task.assignee.image || undefined} />
                      <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                        {task.assignee.name?.slice(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{task.assignee.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned" className="text-xs">Unassigned</SelectItem>
              {eligibleAssignees.map((user) => (
                <SelectItem key={user.id} value={user.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-4">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback>{user.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {user.name} {user.id === currentUser.id && '(Me)'}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-bold">
            <ShieldCheck className="size-3" />
            Priority
          </Label>
          <Select 
            value={task.priority} 
            onValueChange={(val) => onUpdate('priority', val as Priority)}
          >
            <SelectTrigger className={cn(
              "h-10 bg-muted/20 border-primary/5 hover:border-primary/20 transition-all focus:ring-0",
              getPriorityColor(task.priority)
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="URGENT" className="text-red-500 font-bold">URGENT</SelectItem>
              <SelectItem value="HIGH" className="text-orange-500 font-bold">HIGH</SelectItem>
              <SelectItem value="MEDIUM" className="text-blue-500 font-bold">MEDIUM</SelectItem>
              <SelectItem value="LOW" className="text-green-500 font-bold">LOW</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-bold">
            <Clock className="size-3" />
            Due Date
          </Label>
          <Input
            type="date"
            value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate('dueDate', e.target.value)}
            className="h-10 bg-muted/20 border-primary/5 hover:border-primary/20 transition-all focus:ring-0 text-xs"
          />
        </div>

        <div className="space-y-3 pt-2">
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 font-bold">
            <TagIcon className="size-3" />
            Labels
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {task.tags?.map((tag) => (
              <Badge 
                key={tag.id}
                variant="outline"
                className="group pl-2 pr-1 py-0.5 h-6 bg-muted/30 border-primary/5 text-[10px] font-medium flex items-center gap-1 hover:bg-muted/50 transition-colors"
                style={{ borderLeft: `3px solid ${tag.color}` }}
              >
                {tag.name}
                <X 
                  className="size-3 cursor-pointer hover:text-red-500 transition-colors" 
                  onClick={() => onRemoveTag(tag.id)}
                />
              </Badge>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-all">
                  <Plus className="size-3 mr-1" />
                  Add Label
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2 bg-background/95 backdrop-blur-md border-primary/10" align="start">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 tracking-widest">Select Label</p>
                  {boardTags
                    .filter(t => !task.tags?.some(tt => tt.id === t.id))
                    .map((tag) => (
                      <Button
                        key={tag.id}
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 text-xs hover:bg-primary/5"
                        onClick={() => onAddTag(tag.id)}
                      >
                        <div className="size-2 rounded-full mr-2" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </Button>
                    ))}
                  {boardTags.filter(t => !task.tags?.some(tt => tt.id === t.id)).length === 0 && (
                    <p className="text-[10px] text-center py-2 text-muted-foreground">No more labels</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-primary/5 space-y-4">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest">
            <AlertCircle className="size-3" />
            Task Status
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Created {new Date(task.createdAt).toLocaleDateString()}
            </p>
            {task.updatedAt && (
              <p className="text-[10px] text-muted-foreground/60">
                Last modified {new Date(task.updatedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}
