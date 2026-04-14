'use client'

import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats'
import { StatCard } from './stat-card'
import { CheckSquare, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { Task } from '@/lib/slices/boardsApi'

interface PersonalMetricsProps {
  tasks: Task[]
  userId: string
}

export default function PersonalMetrics({ tasks, userId }: PersonalMetricsProps) {
  const stats = useDashboardStats(tasks, userId)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={CheckSquare}
        label="Tasks Due Today"
        value={stats.tasksDueToday}
        iconColor="text-blue-500"
        iconBgColor="bg-blue-500/10"
      />
      <StatCard
        icon={AlertCircle}
        label="Overdue Tasks"
        value={stats.overdueTasks}
        iconColor="text-red-500"
        iconBgColor="bg-red-500/10"
      />
      <StatCard
        icon={TrendingUp}
        label="Weekly Throughput"
        value={stats.throughput}
        iconColor="text-green-500"
        iconBgColor="bg-green-500/10"
      />
      <StatCard
        icon={Clock}
        label="Your Avg Cycle Time"
        value={stats.avgCycleTime}
        iconColor="text-orange-500"
        iconBgColor="bg-orange-500/10"
      />
    </div>
  )
}
