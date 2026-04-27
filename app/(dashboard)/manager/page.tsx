'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BoardCard } from '@/components/dashboard/board-card'
import { StatCard } from '@/components/dashboard/stat-card'
import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
import { useGetDashboardTasksQuery } from '@/lib/slices/tasksApi'
import { useGetSessionQuery } from '@/lib/slices/authApi'
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRouter } from 'next/navigation'
import { Plus, Users, SquareCheck, TrendingUp, Clock, AlertCircle, BarChart3 } from 'lucide-react'
import { useEffect } from 'react'

export default function ManagerDashboardPage() {
  const router = useRouter()
  const { data: boards, isLoading } = useGetBoardsQuery()
  const { data: session } = useGetSessionQuery()
  const { data: dashboardTasks } = useGetDashboardTasksQuery()

  useEffect(() => {
    if (session && session.role !== 'MANAGER') {
      router.replace(session.role === 'ADMIN' ? '/admin' : '/dashboard')
    }
  }, [session, router])

  // Filter boards where user is owner or manager/admin
  const managedBoards = boards?.filter((board) => {
    const userId = session?.id
    if (board.ownerId === userId) return true
    const member = board.members.find((m: any) => m.userId === userId)
    return member && (member.role === 'ADMIN' || member.role === 'MANAGER')
  }) || []

  // Use dashboard tasks endpoint - board.tasks is not included in boards API response
  const allTasks = dashboardTasks || []

  const totalMembers = managedBoards.reduce((sum, board) => sum + (board.members?.length || 0), 0)

  // Use shared stats hook
  const stats = useDashboardStats(allTasks)

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-hero font-waldenburg font-light">Manager Dashboard</h1>
          <p className="text-body text-muted-foreground mt-2">Overview of your teams and boards</p>
        </div>
        <Button className="rounded-[9999px]" onClick={() => router.push('/dashboard/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Board
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-min">
        <StatCard
          icon={SquareCheck}
          label="Boards Managed"
          value={managedBoards.length}
          iconColor="text-blue-500"
          iconBgColor="bg-blue-500/10"
        />
        <StatCard
          icon={Users}
          label="Total Members"
          value={totalMembers}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-500/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Active Tasks"
          value={stats.totalTasks}
          iconColor="text-green-500"
          iconBgColor="bg-green-500/10"
        />
        <StatCard
          icon={AlertCircle}
          label="Blocked Tasks"
          value={stats.blockedTasks}
          iconColor="text-red-500"
          iconBgColor="bg-red-500/10"
        />
        <StatCard
          icon={BarChart3}
          label="Weekly Throughput"
          value={stats.throughput}
          iconColor="text-purple-500"
          iconBgColor="bg-purple-500/10"
        />
        <StatCard
          icon={Clock}
          label="Avg Cycle Time"
          value={stats.avgCycleTime}
          iconColor="text-orange-500"
          iconBgColor="bg-orange-500/10"
        />
      </div>

      {/* Boards Grid */}
      <div>
        <h2 className="text-card-heading font-waldenburg font-light mb-4">Your Boards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {managedBoards.map((board) => (
            <BoardCard
              key={board.id}
              board={board}
              onClick={() => router.push(`/board/${board.id}`)}
            />
          ))}

          {managedBoards.length === 0 && (
            <Card className="p-12 col-span-full text-center rounded-[20px]">
              <p className="text-body-standard text-muted-foreground">
                You don't manage any boards yet. Create one to get started!
              </p>
              <Button className="mt-4 rounded-[9999px]" onClick={() => router.push('/dashboard/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Board
              </Button>
            </Card>
          )}
        </div>
      </div>
      </div>
    </ScrollArea>
  )
}
