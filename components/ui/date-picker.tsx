'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
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
  isBefore,
  isAfter,
  startOfDay,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface DatePickerProps {
  value: Date | null
  onChange: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

export function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled = false,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(value ? startOfMonth(value) : startOfMonth(new Date()))

  useEffect(() => {
    if (value) setViewMonth(startOfMonth(value))
  }, [value])

  const handlePrevMonth = useCallback(() => setViewMonth((m) => subMonths(m, 1)), [])
  const handleNextMonth = useCallback(() => setViewMonth((m) => addMonths(m, 1)), [])

  const handleSelect = useCallback(
    (day: Date) => {
      onChange(day)
      setOpen(false)
    },
    [onChange]
  )

  const renderDays = () => {
    const monthStart = startOfMonth(viewMonth)
    const monthEnd = endOfMonth(viewMonth)
    const calStart = startOfWeek(monthStart)
    const calEnd = endOfWeek(monthEnd)

    const days: Date[] = []
    let current = calStart
    while (current <= calEnd) {
      days.push(current)
      current = addDays(current, 1)
    }

    const rows: React.ReactNode[] = []
    for (let i = 0; i < days.length; i += 7) {
      const week = days.slice(i, i + 7)
      rows.push(
        <div key={i} className="flex">
          {week.map((day) => {
            const isDisabled =
              (minDate && isBefore(day, startOfDay(minDate))) ||
              (maxDate && isAfter(day, startOfDay(maxDate)))
            const selected = value && isSameDay(day, value)
            const sameMonth = isSameMonth(day, viewMonth)
            const today = isToday(day)

            return (
              <button
                key={day.toISOString()}
                type="button"
                disabled={isDisabled || !sameMonth}
                onClick={() => handleSelect(day)}
                className={`h-9 w-9 text-xs rounded-full transition-colors
                  ${!sameMonth ? 'text-muted-foreground/30' : ''}
                  ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-accent-soft'}
                  ${selected ? 'bg-accent text-on-primary hover:bg-accent-strong' : ''}
                  ${today && !selected ? 'border border-accent text-accent' : ''}
                  ${!selected && !today && sameMonth ? 'text-ink' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>
      )
    }
    return rows
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={`w-full justify-start text-left font-normal ${!value ? 'text-muted-text' : ''} ${className || ''}`}
        >
          {value ? format(value, 'MMM d, yyyy') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">{format(viewMonth, 'MMMM yyyy')}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-0">
            {DAYS.map((d) => (
              <div key={d} className="h-9 w-9 flex items-center justify-center text-xs text-muted-text font-medium">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-0">{renderDays()}</div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
