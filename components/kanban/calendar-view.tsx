'use client'

import { useState, useMemo } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CalendarViewProps {
  tasks: any[]
  onTaskClick: (taskId: string) => void
}

export default function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const tasksByDay = useMemo(() => {
    const map: Record<string, any[]> = {}
    tasks.forEach(task => {
      if (task.dueDate) {
        const dateStr = format(parseISO(task.dueDate), 'yyyy-MM-dd')
        if (!map[dateStr]) map[dateStr] = []
        map[dateStr].push(task)
      }
    })
    return map
  }, [tasks])

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const goToToday = () => setCurrentDate(new Date())

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl border border-black/5 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-black/5 bg-black/[0.02]">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-black rounded-2xl shadow-lg">
            <CalendarIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
            <p className="text-sm text-black/40 font-medium">Temporal Task Distribution</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday} className="rounded-full px-6 font-semibold border-black/10">
            Today
          </Button>
          <div className="flex items-center bg-black/5 rounded-full p-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-full hover:bg-white">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-full hover:bg-white">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 border-b border-black/5 bg-black/[0.01]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="py-4 text-center text-xs font-bold uppercase tracking-widest text-black/30">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7 h-full min-h-[600px]">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayTasks = tasksByDay[dateKey] || []
            const isToday = isSameDay(day, new Date())
            const isCurrentMonth = isSameMonth(day, monthStart)

            return (
              <div
                key={day.toString()}
                className={cn(
                  "min-h-[120px] p-3 border-r border-b border-black/5 transition-colors group",
                  !isCurrentMonth && "bg-black/[0.02] opacity-40",
                  isToday && "bg-blue-50/30"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={cn(
                    "inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all",
                    isToday ? "bg-black text-white shadow-lg" : "text-black/60 group-hover:text-black"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-bold text-black/30 uppercase tracking-tighter">
                      {dayTasks.length} {dayTasks.length === 1 ? 'Task' : 'Tasks'}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      onClick={() => onTaskClick(task.id)}
                      className={cn(
                        "px-2 py-1.5 rounded-lg text-[11px] font-bold truncate cursor-pointer shadow-sm transition-all hover:scale-[1.02] border border-black/5",
                        task.priority === 'URGENT' ? "bg-red-50 text-red-700" :
                        task.priority === 'HIGH' ? "bg-amber-50 text-amber-700" :
                        task.priority === 'MEDIUM' ? "bg-blue-50 text-blue-700" :
                        "bg-gray-50 text-gray-700"
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
