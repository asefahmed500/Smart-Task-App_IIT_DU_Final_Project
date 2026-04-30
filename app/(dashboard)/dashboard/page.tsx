'use client'

import { useGetBoardsQuery } from '@/lib/slices/boardsApi'
import { useGetProfileQuery } from '@/lib/slices/usersApi'
import { useGetDashboardTasksQuery } from '@/lib/slices/tasksApi'
import { useDashboardStats } from '@/lib/hooks/use-dashboard-stats'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, ArrowRight } from 'lucide-react'
import PersonalMetrics from '@/components/dashboard/personal-metrics'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div>
        <Skeleton className="h-8 w-40 mb-4" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: boards, isLoading: boardsLoading, error: boardsError } = useGetBoardsQuery()
  const { data: profile, isLoading: profileLoading } = useGetProfileQuery()
  const { data: dashboardTasks, isLoading: tasksLoading } = useGetDashboardTasksQuery()

  // Handle role-based redirect
  const handleRedirect = useCallback(() => {
    if (!profile) return

    const targetPath = profile.role === 'ADMIN' ? '/admin'
      : profile.role === 'MANAGER' ? '/manager'
      : '/member'

    // Don't redirect if already on target path
    if (pathname === targetPath) {
      return
    }

    router.replace(targetPath)
  }, [profile, router, pathname])

  // Redirect on mount once profile is loaded
  useEffect(() => {
    handleRedirect()
  }, [handleRedirect])

  // Calculate tasks for stats (must be before early returns to satisfy Rules of Hooks)
  const allTasks = dashboardTasks || []
  useDashboardStats(allTasks) // We just call the hook to populate stats in UI/Redux if needed, ignore return to fix unused var

  // Show loading skeleton while profile loads to prevent flash
  if (profileLoading || boardsLoading || tasksLoading || !profile) {
    return <DashboardSkeleton />
  }

  // Show error if boards failed to load
  if (boardsError) {
    return (
      <div className="container max-w-7xl mx-auto px-6 py-8">
        <div className="text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-4 py-3">
          Failed to load boards. Please refresh the page.
        </div>
      </div>
    )
  }

  // Return loading skeleton if not on /dashboard (prevents flicker during redirect)
  if (pathname !== '/dashboard') {
    return <DashboardSkeleton />
  }

  const roleColor = {
    ADMIN: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    MANAGER: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    MEMBER: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  }

  return (
    <div className="container max-w-7xl mx-auto space-y-8 px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-hero font-waldenburg font-light">
            Welcome back, {profile?.name || 'User'}!
          </h1>
          <p className="text-body text-muted-foreground">
            {profile?.role === 'MEMBER'
              ? 'Here are your assigned tasks and boards.'
              : 'Here is what is happening with your tasks today.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className={roleColor[profile?.role as keyof typeof roleColor || 'MEMBER']}
          >
            {profile?.role}
          </Badge>
          {profile?.role !== 'MEMBER' && (
            <Button onClick={() => router.push('/dashboard/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Board
            </Button>
          )}
        </div>
      </div>

      <PersonalMetrics tasks={allTasks} userId={profile?.id || ''} />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Boards</h2>
          <Button variant="ghost" size="sm">
            View all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {boards && boards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boards.slice(0, 6).map((board) => (
              <Card
                key={board.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push(`/board/${board.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: board.color }}
                    />
                    <Badge variant="secondary" className="text-xs">
                      {board._count?.members || 0} members
                    </Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{board.name}</h3>
                  {board.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {board.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{board._count?.tasks || 0} tasks</span>
                    <span>Updated {new Date(board.updatedAt).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}

            {profile?.role !== 'MEMBER' && (
              <Card
                className="border-dashed hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => router.push('/dashboard/new')}
              >
                <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1">Create New Board</h3>
                  <p className="text-sm text-muted-foreground">
                    Set up a new workspace for your team
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No boards yet</h3>
              <p className="text-muted-foreground mb-4">
                {profile?.role === 'MEMBER'
                  ? 'You have not been assigned to any boards yet.'
                  : 'Create your first board to get started with Smart Task Manager'}
              </p>
              {profile?.role !== 'MEMBER' && (
                <Button onClick={() => router.push('/dashboard/new')}>
                  Create Board
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}