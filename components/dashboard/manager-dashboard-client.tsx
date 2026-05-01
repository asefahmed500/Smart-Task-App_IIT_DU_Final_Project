'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Layout, Users, AlertTriangle, ListChecks, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Board {
  id: string
  name: string
  memberCount: number
  taskCount: number
}

interface ManagerDashboardClientProps {
  user: { name: string | null; email: string }
  data: {
    boards: Board[]
    totalTasks: number
    completedThisWeek: number
    teamMemberCount: number
    unassignedTasks: number
    bottleneckColumns: { name: string; taskCount: number }[]
  }
}

export function ManagerDashboardClient({ user, data }: ManagerDashboardClientProps) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manager Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}. Here&apos;s your team overview.</p>
        </div>
        <Button className="gap-2" onClick={() => router.push('/admin/boards')}>
          <Plus className="size-4" />
          Create Board
        </Button>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-none bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Team Boards</CardTitle>
            <Layout className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.boards.length}</div>
            <p className="text-xs text-muted-foreground">Active projects</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <ListChecks className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.totalTasks}</div>
            <p className="text-xs text-muted-foreground">{data.completedThisWeek} completed this week</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.teamMemberCount}</div>
            <p className="text-xs text-muted-foreground">All members active</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-amber-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertTriangle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{data.unassignedTasks}</div>
            <Badge variant="secondary" className="mt-1">Needs attention</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle>Team Boards</CardTitle>
          </CardHeader>
          <CardContent>
            {data.boards.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-10">
                No boards found. Create a board to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {data.boards.map((board) => (
                  <Link
                    key={board.id}
                    href={`/dashboard/board/${board.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded bg-primary/10 flex items-center justify-center">
                        <Layout className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{board.name}</p>
                        <p className="text-xs text-muted-foreground">{board.memberCount} members</p>
                      </div>
                    </div>
                    <Badge variant="outline">{board.taskCount} tasks</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Bottleneck Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {data.bottleneckColumns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No bottlenecks detected</p>
            ) : (
              <div className="space-y-4">
                {data.bottleneckColumns.map((col) => (
                  <div key={col.name} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                        <AlertTriangle className="size-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{col.name}</p>
                        <p className="text-xs text-muted-foreground">High backlog</p>
                      </div>
                    </div>
                    <Badge variant="destructive">{col.taskCount} tasks</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}