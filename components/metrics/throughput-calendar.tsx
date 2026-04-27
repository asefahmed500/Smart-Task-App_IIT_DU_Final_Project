'use client'

import { useState, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { useGetBoardMetricsQuery } from '@/lib/slices/boardsApi'
import { cn } from '@/lib/utils'

interface ThroughputCalendarProps {
  boardId: string
  days?: number
}

interface DayData {
  date: string
  count: number
  dayOfWeek?: number
}

export default function ThroughputCalendar({ boardId, days = 90 }: ThroughputCalendarProps) {
  const { data: metrics, isLoading } = useGetBoardMetricsQuery(boardId)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  const data = useMemo(() => {
    if (!metrics?.throughput) return []
    return metrics.throughput.map((d) => ({
      ...d,
      dayOfWeek: new Date(d.date).getDay(),
    }))
  }, [metrics])

  // Organize into 7-day weeks (GitHub-style)
  const weeks: DayData[][] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Start from (days - 1) days ago
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - (days - 1))

  for (let i = 0; i < Math.ceil(days / 7); i++) {
    const week: DayData[] = []
    for (let j = 0; j < 7; j++) {
      const date = new Date(startDate)
      date.setDate(date.getDate() + (i * 7) + j)
      const dateStr = date.toISOString().split('T')[0]
      const found = data.find((d) => d.date === dateStr)
      week.push(found || { date: dateStr, count: 0, dayOfWeek: j })
    }
    weeks.push(week)
  }

  const getColor = (count: number) => {
    if (count === 0) return 'bg-[#ebedf0]'
    if (count <= 3) return 'bg-[#9be9a8]'
    if (count <= 6) return 'bg-[#40c463]'
    return 'bg-[#30a14e]'
  }

  const getAvgThroughput = () => {
    const total = data.reduce((sum, d) => sum + d.count, 0)
    return data.length > 0 ? (total / data.length).toFixed(1) : '0'
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-section-heading font-waldenburg font-light mb-4">Throughput Calendar</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-[#f5f5f5] rounded" />
          ))}
        </div>
      </Card>
    )
  }

  const hasData = data.some(d => d.count > 0)

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-section-heading font-waldenburg font-light">Throughput Calendar</h3>
          <p className="text-[10px] text-muted-foreground uppercase opacity-60">Past 90 days activity</p>
        </div>
        <div className="text-caption text-muted-foreground flex items-center gap-2">
          <span className="font-medium bg-[rgba(0,0,0,0.04)] px-2 py-1 rounded">Avg: {getAvgThroughput()}</span>
          <span className="opacity-60">tasks / day</span>
        </div>
      </div>

      <div className="space-y-1 relative">
        {!hasData && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[1px] rounded-lg border border-dashed border-[rgba(0,0,0,0.1)]">
            <p className="text-xs font-medium text-muted-foreground bg-white px-4 py-2 rounded-full shadow-sm">
              No completion data found for this period
            </p>
          </div>
        )}

        {/* Day labels */}
        <div className="flex ml-10 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="flex-1 text-center text-[10px] font-medium text-muted-foreground opacity-70">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex items-center gap-1.5">
            <div className="w-10 text-[9px] font-medium text-muted-foreground text-right pr-2 uppercase opacity-60">
              {new Date(new Date().setDate(new Date().getDate() - (days - 1 - weekIndex * 7))).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            {week.map((day) => (
              <div
                key={day.date}
                className={cn(
                  "flex-1 aspect-square rounded-sm cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all relative",
                  getColor(day.count)
                )}
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {hoveredDay === day.date && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1a1a1a] text-white text-[10px] rounded shadow-xl whitespace-nowrap z-20">
                    <span className="font-bold">{day.count} tasks</span> completed on {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 mt-6 text-[10px] font-medium text-muted-foreground">
        <span className="opacity-60">Less</span>
        <div className="flex gap-1">
          <div className="w-3.5 h-3.5 rounded-sm bg-[#ebedf0] border border-[rgba(0,0,0,0.04)]" />
          <div className="w-3.5 h-3.5 rounded-sm bg-[#9be9a8]" />
          <div className="w-3.5 h-3.5 rounded-sm bg-[#40c463]" />
          <div className="w-3.5 h-3.5 rounded-sm bg-[#30a14e]" />
        </div>
        <span className="opacity-60">More</span>
      </div>
    </Card>
  )
}
