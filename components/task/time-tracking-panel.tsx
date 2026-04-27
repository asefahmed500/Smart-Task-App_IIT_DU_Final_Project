"use client"

import { useState, useEffect, useMemo } from "react"
import { 
  useGetTimeLogsQuery, 
  useLogTimeMutation 
} from "@/lib/slices/tasksApi"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, Square, Clock, Plus, History, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "sonner"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface TimeTrackingPanelProps {
  taskId: string
  totalTimeSpent: number
}

export function TimeTrackingPanel({ taskId, totalTimeSpent }: TimeTrackingPanelProps) {
  const { data: logs, isLoading } = useGetTimeLogsQuery(taskId)
  const [logTime, { isLoading: isLogging }] = useLogTimeMutation()
  
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false)
  const [manualDescription, setManualDescription] = useState("")
  const [manualHours, setManualHours] = useState("0")
  const [manualMinutes, setManualMinutes] = useState("0")

  // Find the running timer (if any)
  const runningLog = useMemo(() => logs?.find(l => !l.endTime), [logs])
  
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (runningLog) {
      const start = new Date(runningLog.startTime).getTime()
      setElapsed(Math.floor((Date.now() - start) / 1000))
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000))
      }, 1000)
    } else {
      setElapsed(0)
    }
    return () => clearInterval(interval)
  }, [runningLog])

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h > 0 ? `${h}h ` : ""}${m}m ${s}s`
  }

  const formatTotalTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  const handleStart = async () => {
    try {
      await logTime({ taskId, action: "start" }).unwrap()
      toast.success("Timer started")
    } catch (err: any) {
      toast.error(err.data?.error || "Failed to start timer")
    }
  }

  const handleStop = async () => {
    try {
      await logTime({ taskId, action: "stop" }).unwrap()
      toast.success("Timer stopped")
    } catch (err: any) {
      toast.error(err.data?.error || "Failed to stop timer")
    }
  }

  const handleManualLog = async () => {
    const totalSeconds = (parseInt(manualHours) * 3600) + (parseInt(manualMinutes) * 60)
    if (totalSeconds <= 0) {
      toast.error("Please enter a valid duration")
      return
    }

    try {
      await logTime({ 
        taskId, 
        action: "manual", 
        duration: totalSeconds, 
        description: manualDescription 
      }).unwrap()
      toast.success("Time logged manually")
      setIsManualDialogOpen(false)
      setManualDescription("")
      setManualHours("0")
      setManualMinutes("0")
    } catch (err: any) {
      toast.error(err.data?.error || "Failed to log time")
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6 pt-2">
      {/* Timer Section */}
      <div className="bg-[#fcfaf8] border border-[#f1efe9] rounded-[24px] p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-full">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <span className="text-body-standard font-semibold text-[#1a1a1a]">Timer</span>
          </div>
          {runningLog && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase tracking-wider animate-pulse">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              Running
            </div>
          )}
        </div>

        <div className="text-center py-4">
          <div className="text-[42px] font-waldenburg font-light tracking-tighter text-[#1a1a1a]">
            {runningLog ? formatDuration(elapsed) : "00m 00s"}
          </div>
          <p className="text-caption text-muted-foreground mt-1">
            Total recorded: {formatTotalTime(totalTimeSpent)}
          </p>
        </div>

        <div className="flex gap-3 mt-4">
          {runningLog ? (
            <Button 
              onClick={handleStop} 
              disabled={isLogging} 
              className="flex-1 rounded-full h-12 bg-red-500 hover:bg-red-600 text-white border-none shadow-lg shadow-red-200"
            >
              {isLogging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Square className="h-5 w-5 mr-2" />}
              Stop Timer
            </Button>
          ) : (
            <Button 
              onClick={handleStart} 
              disabled={isLogging} 
              className="flex-1 rounded-full h-12 bg-primary hover:bg-primary/90 text-white border-none shadow-lg shadow-primary/20"
            >
              {isLogging ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="h-5 w-5 mr-2 fill-current" />}
              Start Timer
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setIsManualDialogOpen(true)}
            className="h-12 w-12 rounded-full border-[#f1efe9] hover:bg-[#f1efe9]"
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Logs Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center gap-2 mb-4 px-1">
          <History className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-caption uppercase tracking-widest font-bold text-muted-foreground">History</h3>
        </div>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs && logs.length > 0 ? (
              logs.map((log) => (
                <div key={log.id} className="group relative flex gap-3 p-3 hover:bg-[#fcfaf8] rounded-[16px] transition-colors border border-transparent hover:border-[#f1efe9]">
                  <Avatar className="h-8 w-8 mt-0.5 border shadow-sm">
                    <AvatarImage src={log.user?.avatar || undefined} />
                    <AvatarFallback className="text-[10px] bg-slate-100">{log.user?.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-body-standard font-semibold text-[#1a1a1a]">{log.user?.name}</span>
                      <span className="text-[11px] font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-full">
                        {log.duration ? formatDuration(log.duration) : "Running..."}
                      </span>
                    </div>
                    {log.description && (
                      <p className="text-body-standard text-[#4a4a4a] mt-1 line-clamp-2">{log.description}</p>
                    )}
                    <p className="text-[10px] text-[#94a3b8] mt-1 uppercase tracking-tight font-medium font-waldenburg">
                      {formatDistanceToNow(new Date(log.startTime), { addSuffix: true })}
                      {log.endTime && ` • ${new Date(log.startTime).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 opacity-40">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p className="text-body-standard text-muted-foreground">No time logs yet</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Manual Log Dialog */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
        <DialogContent className="rounded-[24px] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-section-heading font-waldenburg font-light">Log Time Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-caption font-bold text-muted-foreground">Hours</Label>
                <Input 
                  type="number" 
                  min="0" 
                  value={manualHours} 
                  onChange={(e) => setManualHours(e.target.value)}
                  className="rounded-[12px] h-12 bg-[#f8f9fa] border-none"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-caption font-bold text-muted-foreground">Minutes</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="59"
                  value={manualMinutes} 
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className="rounded-[12px] h-12 bg-[#f8f9fa] border-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-caption font-bold text-muted-foreground">Description (Optional)</Label>
              <Textarea 
                value={manualDescription} 
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="What did you work on?"
                className="rounded-[12px] bg-[#f8f9fa] border-none resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsManualDialogOpen(false)} className="rounded-full">Cancel</Button>
            <Button onClick={handleManualLog} disabled={isLogging} className="rounded-full px-8 bg-primary hover:bg-primary/90 text-white border-none">
              {isLogging ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
