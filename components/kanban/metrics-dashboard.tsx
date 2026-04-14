'use client'

import { useGetBoardMetricsQuery } from '@/lib/slices/boardsApi'
import { Card } from '@/components/ui/card'
import FlowMetrics from '../metrics/flow-metrics'
import ThroughputCalendar from '../metrics/throughput-calendar'
import { AlertCircle, Loader2 } from 'lucide-react'

interface MetricsDashboardProps {
  boardId: string
}

export default function MetricsDashboard({ boardId }: MetricsDashboardProps) {
  const { data: metrics, isLoading, error } = useGetBoardMetricsQuery(boardId)

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <div className="flex-1 p-8 items-center justify-center flex flex-col min-h-[400px]">
        <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-red-500">Failed to load metrics data</h3>
        <p className="text-muted-foreground text-sm max-w-sm text-center">
          Wait a moment or check your connection.
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="space-y-1">
        <h2 className="text-section-heading font-waldenburg font-medium tracking-tight">Flow & Performance Metrics</h2>
        <p className="text-caption text-muted-foreground">
          Track lifecycle data, cycle times, and throughput mapping based on strict real-time completions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 flex flex-col items-start min-h-[350px]">
          <h3 className="text-body font-medium mb-6">Aggregate Cycle & Lead Times</h3>
          <div className="w-full flex-1 flex flex-row items-center gap-12 w-full justify-center opacity-90 hover:opacity-100 transition-opacity">
            <div className="flex flex-col items-center">
               <span className="text-4xl font-light font-waldenburg tracking-tight">{metrics.leadTime?.avg ?? 0}</span>
               <span className="text-caption text-muted-foreground mt-2 uppercase tracking-wide font-medium">Avg Lead Time (Days)</span>
               <span className="text-xs text-muted-foreground/60 w-32 text-center mt-2 leading-tight">Creation to Done</span>
            </div>
            
            <div className="h-16 w-px bg-border/50 hidden md:block" />

            <div className="flex flex-col items-center">
               <span className="text-4xl font-light font-waldenburg tracking-tight text-blue-600">{metrics.cycleTime?.avg ?? 0}</span>
               <span className="text-caption text-muted-foreground mt-2 uppercase tracking-wide font-medium">Avg Cycle Time (Days)</span>
               <span className="text-xs text-muted-foreground/60 w-32 text-center mt-2 leading-tight">In Progress to Done</span>
            </div>
            
            <div className="h-16 w-px bg-border/50 hidden md:block" />
            
            <div className="flex flex-col items-center">
               <span className="text-4xl font-light font-waldenburg tracking-tight">{metrics.completedTasks}</span>
               <span className="text-caption text-muted-foreground mt-2 uppercase tracking-wide font-medium">Tasks Completed</span>
               <span className="text-xs text-muted-foreground/60 w-32 text-center mt-2 leading-tight">Historically Tracked</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 h-full flex flex-col justify-center">
          <ThroughputCalendar boardId={boardId} />
        </Card>
      </div>
      
      <Card className="p-6">
         <FlowMetrics boardId={boardId} />
      </Card>
    </div>
  )
}
