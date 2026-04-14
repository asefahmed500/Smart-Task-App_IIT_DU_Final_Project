'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { calculateCycleTime } from '@/lib/metrics/cycle-time'
import { calculateLeadTime } from '@/lib/metrics/lead-time'

interface FlowMetricsProps {
  boardId: string
}

interface Metrics {
  avg: number
  median: number
  p95: number
  count: number
}

export default function FlowMetrics({ boardId }: FlowMetricsProps) {
  const [cycleTime, setCycleTime] = useState<Metrics | null>(null)
  const [leadTime, setLeadTime] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true)
      try {
        const [cycle, lead] = await Promise.all([
          calculateCycleTime(boardId),
          calculateLeadTime(boardId),
        ])
        setCycleTime(cycle)
        setLeadTime(lead)
      } catch (error) {
        console.error('Failed to load metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    loadMetrics()
  }, [boardId])

  const MetricBar = ({ value, max = 30, label, color = 'bg-blue-500' }: { value: number; max?: number; label: string; color?: string }) => {
    const percentage = Math.min((value / max) * 100, 100)
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-caption">
          <span className="text-[#777169]">{label}</span>
          <span className="font-medium">{value}d</span>
        </div>
        <div className="h-2 bg-[#f5f5f5] rounded-full overflow-hidden">
          <div className={`h-full ${color} transition-all`} style={{ width: `${percentage}%` }} />
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-section-heading font-waldenburg font-light mb-4">Flow Metrics</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-[#f5f5f5] rounded" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-section-heading font-waldenburg font-light mb-6">Flow Metrics</h3>

      <div className="space-y-6">
        {/* Cycle Time */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-body font-medium">Cycle Time</h4>
            <span className="text-caption text-[#777169]">Based on {cycleTime?.count || 0} tasks</span>
          </div>
          <div className="space-y-2 pl-4 border-l-2 border-[#3b82f6]">
            <MetricBar label="Average" value={cycleTime?.avg || 0} color="bg-blue-500" />
            <MetricBar label="Median" value={cycleTime?.median || 0} color="bg-blue-400" />
            <MetricBar label="95th Percentile" value={cycleTime?.p95 || 0} max={60} color="bg-blue-300" />
          </div>
          <p className="text-caption text-[#777169] mt-2">Time from "In Progress" to "Done"</p>
        </div>

        {/* Lead Time */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-body font-medium">Lead Time</h4>
            <span className="text-caption text-[#777169]">Based on {leadTime?.count || 0} tasks</span>
          </div>
          <div className="space-y-2 pl-4 border-l-2 border-[#10b981]">
            <MetricBar label="Average" value={leadTime?.avg || 0} color="bg-green-500" />
            <MetricBar label="Median" value={leadTime?.median || 0} color="bg-green-400" />
            <MetricBar label="95th Percentile" value={leadTime?.p95 || 0} max={60} color="bg-green-300" />
          </div>
          <p className="text-caption text-[#777169] mt-2">Time from creation to "Done"</p>
        </div>
      </div>
    </Card>
  )
}
