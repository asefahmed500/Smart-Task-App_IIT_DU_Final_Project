'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getSprintsByBoard } from '@/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  isWithinInterval,
  parseISO,
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'

const STATUS_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  PLANNED: { bg: 'bg-blue-100', text: 'text-blue-800', bar: 'bg-blue-500' },
  ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-800', bar: 'bg-emerald-500' },
  COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-800', bar: 'bg-slate-400' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', bar: 'bg-red-400' },
}

interface SprintData {
  id: string
  name: string
  startDate: string
  endDate: string
  status: string
  goal: string | null
  _count: { tasks: number }
}

interface Board {
  id: string
  name: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function SprintCalendar({
  boardId,
  boards,
  basePath = '/manager',
  readOnly = false,
}: {
  boardId: string
  boards: Board[]
  basePath?: string
  readOnly?: boolean
}) {
  const router = useRouter()
  const [sprints, setSprints] = useState<SprintData[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMonth, setViewMonth] = useState(startOfMonth(new Date()))

  useEffect(() => {
    loadSprints()
  }, [boardId])

  async function loadSprints() {
    setLoading(true)
    const res = await getSprintsByBoard(boardId)
    if (res.success) setSprints(res.data || [])
    setLoading(false)
  }

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calStart = startOfWeek(monthStart)
  const calEnd = endOfWeek(monthEnd)

  const days = useMemo(() => {
    const result: Date[] = []
    let current = calStart
    while (current <= calEnd) {
      result.push(current)
      current = addDays(current, 1)
    }
    return result
  }, [calStart, calEnd])

  const weeks = useMemo(() => {
    const result: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7))
    }
    return result
  }, [days])

  const sprintsForMonth = useMemo(() => {
    return sprints.filter((s) => {
      const start = new Date(s.startDate)
      const end = new Date(s.endDate)
      return start <= calEnd && end >= calStart
    })
  }, [sprints, calStart, calEnd])

  function getSprintsForDay(day: Date) {
    return sprintsForMonth.filter((s) => {
      const start = new Date(s.startDate)
      const end = new Date(s.endDate)
      return isWithinInterval(day, { start, end })
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <CalendarDays className="h-8 w-8 animate-spin text-muted-text mx-auto" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sprint Calendar</h1>
          <p className="text-sm text-muted-text mt-1">{sprints.length} sprints</p>
        </div>
        <div className="flex items-center gap-2">
          {boards.length > 1 && (
            <Select
              value={boardId}
              onValueChange={(v) => router.push(`${basePath}/sprints/calendar?boardId=${v}`)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select board" />
              </SelectTrigger>
              <SelectContent>
                {boards.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {format(viewMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="sm" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setViewMonth(startOfMonth(new Date()))}>
            Today
          </Button>
        </div>
      </div>

      {/* Sprint legend */}
      <div className="flex items-center gap-4 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, colors]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${colors.bar}`} />
            <span className="text-muted-text">{status.charAt(0) + status.slice(1).toLowerCase()}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <Card className="border-hairline overflow-hidden">
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-hairline">
            {DAYS.map((day) => (
              <div key={day} className="py-2 text-center text-xs font-medium text-muted-text border-r border-hairline last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-hairline last:border-b-0">
              {week.map((day, di) => {
                const isCurrentMonth = isSameMonth(day, viewMonth)
                const today = isToday(day)
                const daySprints = getSprintsForDay(day)

                return (
                  <div
                    key={di}
                    className={`min-h-[100px] p-1 border-r border-hairline last:border-r-0 ${
                      isCurrentMonth ? 'bg-canvas' : 'bg-canvas-soft'
                    } ${today ? 'bg-accent-soft/50' : ''}`}
                  >
                    <div className={`text-xs font-medium mb-1 px-1.5 py-0.5 rounded-full w-fit ${
                      today ? 'bg-accent text-on-primary font-bold' : isCurrentMonth ? 'text-ink' : 'text-muted-text'
                    }`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-0.5">
                      {daySprints.slice(0, 3).map((s) => {
                        const colors = STATUS_COLORS[s.status] || STATUS_COLORS.PLANNED
                        const isStart = isSameDay(day, new Date(s.startDate))
                        const isEnd = isSameDay(day, new Date(s.endDate))
                        return (
                          <button
                            key={s.id}
                            onClick={() => router.push(`${basePath}/sprints/${s.id}`)}
                            className={`w-full text-left text-[9px] px-1.5 py-0.5 rounded truncate transition-colors hover:opacity-80 ${colors.bg} ${colors.text}`}
                            title={`${s.name}: ${new Date(s.startDate).toLocaleDateString()} - ${new Date(s.endDate).toLocaleDateString()}`}
                          >
                            {isStart ? s.name : (isEnd ? `${s.name} (end)` : '\u00A0')}
                          </button>
                        )
                      })}
                      {daySprints.length > 3 && (
                        <div className="text-[9px] text-muted-text px-1">
                          +{daySprints.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sprint list below calendar */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold">All Sprints</h2>
        {sprintsForMonth.length === 0 ? (
          <p className="text-sm text-muted-text">No sprints in this month</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {sprintsForMonth.map((s) => {
              const colors = STATUS_COLORS[s.status] || STATUS_COLORS.PLANNED
              return (
                <Card
                  key={s.id}
                  className="border-hairline hover:border-accent/30 cursor-pointer transition-colors"
                  onClick={() => router.push(`${basePath}/sprints/${s.id}`)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-1 h-10 rounded-full shrink-0 ${colors.bar}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-text truncate">
                        {format(new Date(s.startDate), 'MMM d')} - {format(new Date(s.endDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <Badge variant="secondary" className={`text-[10px] ${colors.bg} ${colors.text}`}>
                      {s.status}
                    </Badge>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
