'use client'

import { Button } from '@/components/ui/button'
import { useAppSelector } from '@/lib/hooks'

interface SwimlaneGroupSelectProps {
  value: 'assignee' | 'priority' | 'label'
  onChange: (value: 'assignee' | 'priority' | 'label') => void
}

const GROUP_OPTIONS = [
  { label: 'Assignee', value: 'assignee' },
  { label: 'Priority', value: 'priority' },
  { label: 'Label', value: 'label' },
] as const

export default function SwimlaneGroupSelect({ value, onChange }: SwimlaneGroupSelectProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-caption text-[#777169]">Group by:</span>
      <div className="inline-flex bg-muted rounded-lg p-1">
        {GROUP_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={value === option.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onChange(option.value)}
            className="rounded-md"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
