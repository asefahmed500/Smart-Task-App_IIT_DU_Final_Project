'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Clock, Plus, History, Timer, Loader2 } from 'lucide-react'
import { TimeEntry } from '@/types/kanban'
import { format } from 'date-fns'

interface TaskTimeTabProps {
  timeEntries: TimeEntry[]
  isLoggingTime: boolean
  setIsLoggingTime: (val: boolean) => void
  timeDuration: string
  setTimeDuration: (val: string) => void
  timeDescription: string
  setTimeDescription: (val: string) => void
  onLogTime: () => Promise<void>
  isLoading: boolean
}

export function TaskTimeTab({
  timeEntries,
  isLoggingTime,
  setIsLoggingTime,
  timeDuration,
  setTimeDuration,
  timeDescription,
  setTimeDescription,
  onLogTime,
  isLoading
}: TaskTimeTabProps) {
  const totalMinutes = timeEntries.reduce((acc, entry) => acc + entry.duration, 0)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return (
    <div className="space-y-8 pt-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-between shadow-sm group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Total Time Spun</p>
            <p className="text-3xl font-bold tracking-tighter">
              {hours}h {minutes}m
            </p>
          </div>
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
            <Timer className="size-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-muted/20 border border-primary/5 flex items-center justify-between shadow-sm group hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Entries Count</p>
            <p className="text-3xl font-bold tracking-tighter">{timeEntries.length}</p>
          </div>
          <div className="size-12 rounded-full bg-muted/10 flex items-center justify-center text-muted-foreground group-hover:scale-110 transition-transform">
            <History className="size-6" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Clock className="size-4 text-primary" />
            Time Logs
          </div>
          <Button 
            size="sm" 
            onClick={() => setIsLoggingTime(!isLoggingTime)}
            className="h-8 bg-primary/10 text-primary hover:bg-primary/20 border-primary/10"
          >
            <Plus className="mr-2 size-3" />
            {isLoggingTime ? 'Cancel' : 'Log Time'}
          </Button>
        </div>

        {isLoggingTime && (
          <div className="p-6 rounded-2xl border border-primary/10 bg-muted/20 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold">Duration (minutes)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 60"
                  value={timeDuration}
                  onChange={(e) => setTimeDuration(e.target.value)}
                  className="bg-background border-primary/10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">Description (optional)</Label>
              <Textarea
                placeholder="What did you work on?"
                value={timeDescription}
                onChange={(e) => setTimeDescription(e.target.value)}
                className="bg-background border-primary/10 resize-none h-20"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={onLogTime} className="bg-primary shadow-lg shadow-primary/20">
                Save Time Entry
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {timeEntries.map((entry) => (
            <div 
              key={entry.id} 
              className="p-4 rounded-xl border border-primary/5 bg-muted/5 hover:bg-muted/10 transition-all flex items-center justify-between group"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                </p>
                <p className="text-xs text-muted-foreground">{entry.description || 'No description'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {format(new Date(entry.createdAt), 'hh:mm a')}
                </p>
              </div>
            </div>
          ))}

          {timeEntries.length === 0 && !isLoggingTime && (
            <div className="text-center py-12 bg-muted/5 rounded-2xl border-2 border-dashed border-primary/5">
              <Timer className="size-10 mx-auto mb-4 opacity-10" />
              <p className="text-sm text-muted-foreground">No time entries recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
