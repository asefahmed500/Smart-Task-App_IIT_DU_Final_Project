'use client'

import { Card } from '@/components/ui/card'
import { BoardCard } from '@/components/dashboard/board-card'
import { StatCard } from '@/components/dashboard/stat-card'
import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { useGetAssignedTasksQuery } from '@/lib/slices/tasksApi'
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation'
import { CheckSquare, Clock, TrendingUp, Target, AlertCircle } from 'lucide-react'

export default function MemberPage() {
  const router = useRouter()
  const { data: boards } = useGetBoardsQuery()
  const { data: session } = useGetSessionQuery()
  const { data: assignedTasks = [] } = useGetAssignedTasksQuery()

  // Filter boards where user is a member or owner
  const memberBoards = boards?.filter((board) => {
    const userId = session?.id
    if (board.ownerId === userId) return true
    return board.members?.some((m: any) => m.userId === userId)
  }) || []

  // Use shared stats hook with userId to filter for assigned tasks
  const stats = useDashboardStats(assignedTasks, session?.id)

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-hero font-waldenburg font-light">Member Dashboard</h1>
          <p className="text-body text-muted-foreground mt-2">
            Welcome back, {session?.name || 'Member'}! Here are your tasks.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 auto-rows-min">
        <StatCard
          icon={Target}
          label="Assigned to Me"
          value={stats.totalTasks}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={stats.inProgressTasks}
          iconColor="text-orange-500"
          iconBgColor="bg-orange-500/10"
        />
        <StatCard
          icon={CheckSquare}
          label="Completed"
          value={stats.completedTasks}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
        />
        <StatCard
          icon={AlertCircle}
          label="Blocked Tasks"
          value={stats.blockedTasks}
          iconColor="text-red-600"
          iconBgColor="bg-red-600/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Overdue"
          value={stats.overdueTasks}
          iconColor="text-rose-500"
          iconBgColor="bg-rose-500/10"
        />
        <StatCard
          icon={CheckSquare}
          label="Weekly Throughput"
          value={stats.throughput}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-500/10"
        />
        <StatCard
          icon={Clock}
          label="Avg Cycle Time"
          value={stats.avgCycleTime}
          iconColor="text-cyan-500"
          iconBgColor="bg-cyan-500/10"
        />
      </div>

      {/* Tasks Due Today */}
      {stats.tasksDueToday > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-[20px] p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold">Tasks Due Today</h3>
              <p className="text-sm text-muted-foreground">
                You have {stats.tasksDueToday} task{stats.tasksDueToday > 1 ? 's' : ''} due today.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Tasks Alert */}
      {stats.overdueTasks > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-rose-500 rounded-full text-white">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-display-header font-waldenburg">Overdue Tasks Attention Required</h3>
              <p className="text-body text-muted-foreground">
                You have {stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? 's' : ''} that {stats.overdueTasks > 1 ? 'are' : 'is'} currently stalling progress.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* My Boards */}
      <div>
        <h2 className="text-card-heading font-waldenburg font-light mb-4">My Boards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {memberBoards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onClick={() => router.push(`/board/${board.id}`)}
            />
          ))}

          {memberBoards.length === 0 && (
            <Card className="p-12 col-span-full text-center rounded-[20px]">
              <p className="text-body-standard text-muted-foreground">
                You are not a member of any boards yet. Ask your manager to invite you!
              </p>
            </Card>
          )}
        </div>
      </div>
      </div>
    </ScrollArea>
  )
}
