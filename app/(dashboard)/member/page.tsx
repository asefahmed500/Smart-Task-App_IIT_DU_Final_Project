'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BoardCard } from '@/components/dashboard/board-card'
import { StatCard } from '@/components/dashboard/stat-card'
import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { useGetTasksQuery } from '@/lib/slices/tasksApi'
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats'
import { useRouter } from 'next/navigation'
import { CheckSquare, Clock, TrendingUp, Target } from 'lucide-react'

export default function MemberDashboardPage() {
  const router = useRouter()
  const { data: boards } = useGetBoardsQuery()
  const { data: session } = useGetSessionQuery()

  // Filter boards where user is a member
  const memberBoards = boards?.filter((board) => {
    const userId = session?.id
    if (board.ownerId === userId) return true
    return board.members?.some((m: any) => m.userId === userId)
  }) || []

  // Fetch tasks for all member boards
  const tasksQueries = memberBoards.map(board => useGetTasksQuery(board.id))
  const allTasks = tasksQueries.flatMap(q => q.data || [])

  // Use shared stats hook with userId to filter for assigned tasks
  const stats = useDashboardStats(allTasks, session?.id)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-hero font-waldenburg font-light">Member Dashboard</h1>
          <p className="text-body text-[#777169] mt-2">
            Welcome back, {session?.name || 'Member'}! Here are your tasks.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min">
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
          icon={TrendingUp}
          label="Overdue"
          value={stats.overdueTasks}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
      </div>

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
              <p className="text-body-standard text-[#777169]">
                You are not a member of any boards yet. Ask your manager to invite you!
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Tasks Due Today */}
      {stats.tasksDueToday > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-[20px] p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-orange-500" />
            <div>
              <h3 className="text-lg font-semibold">Tasks Due Today</h3>
              <p className="text-sm text-[#777169]">
                You have {stats.tasksDueToday} task{stats.tasksDueToday > 1 ? 's' : ''} due today.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Overdue Tasks Alert */}
      {stats.overdueTasks > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[20px] p-6">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold">Overdue Tasks</h3>
              <p className="text-sm text-[#777169]">
                You have {stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? 's' : ''} that need attention.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
