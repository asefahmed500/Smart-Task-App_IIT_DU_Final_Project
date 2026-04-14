'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { calculateThroughput } from '@/lib/metrics/throughput'

interface ThroughputCalendarProps {
  boardId: string
  days?: number
}

interface DayData {
  date: string
  count: number
  dayOfWeek: number
}

export default function ThroughputCalendar({ boardId, days = 90 }: ThroughputCalendarProps) {
  const [data, setData] = useState<DayData[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredDay, setHoveredDay] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const throughput = await calculateThroughput(boardId, days)
        const withDayOfWeek = throughput.map((d) => ({
          ...d,
          dayOfWeek: new Date(d.date).getDay(),
        }))
        setData(withDayOfWeek)
      } catch (error) {
        console.error('Failed to load throughput:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [boardId, days])

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

  if (loading) {
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

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-section-heading font-waldenburg font-light">Throughput Calendar</h3>
        <div className="text-caption text-[#777169]">
          Avg: {getAvgThroughput()} tasks/day
        </div>
      </div>

      <div className="space-y-1">
        {/* Day labels */}
        <div className="flex ml-8 mb-1">
          {weekDays.map((day) => (
            <div key={day} className="flex-1 text-center text-micro text-[#777169]">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex items-center gap-1">
            <div className="w-8 text-micro text-[#777169] text-right pr-2">
              {new Date(new Date().setDate(new Date().getDate() - (days - 1 - weekIndex * 7))).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            {week.map((day) => (
              <div
                key={day.date}
                className={`flex-1 aspect-square rounded-sm ${getColor(day.count)} cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all relative`}
                onMouseEnter={() => setHoveredDay(day.date)}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {hoveredDay === day.date && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black text-white text-micro rounded whitespace-nowrap z-10">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}: {day.count} tasks
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-caption text-[#777169]">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded-sm bg-[#ebedf0]" />
          <div className="w-4 h-4 rounded-sm bg-[#9be9a8]" />
          <div className="w-4 h-4 rounded-sm bg-[#40c463]" />
          <div className="w-4 h-4 rounded-sm bg-[#30a14e]" />
        </div>
        <span>More</span>
      </div>
    </Card>
  )
}
