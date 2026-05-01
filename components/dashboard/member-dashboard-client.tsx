'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ListTodo, LayoutGrid, Bell, Focus, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Activity {
  action: string
  details: Record<string, unknown>
  createdAt: string
}

interface DashboardTask {
  id: string
  title: string
  priority: string
  column: { name: string; board: { id: string; name: string } }
}

interface MemberDashboardClientProps {
  user: { name: string | null; email: string }
  data: {
    assignedTasks: number
    completedTasks: number
    activeBoardCount: number
    unreadNotifications: number
    myTasks: DashboardTask[]
    focusTasks: DashboardTask[]
    recentActivity: Activity[]
  }
}

export function MemberDashboardClient({ user, data }: MemberDashboardClientProps) {
  const completionRate = data.assignedTasks > 0 
    ? Math.round((data.completedTasks / data.assignedTasks) * 100) 
    : 0

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name}</h1>
        <p className="text-muted-foreground">Here&apos;s your productivity overview.</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-none bg-primary/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
            <ListTodo className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.assignedTasks}</div>
            <p className="text-xs text-muted-foreground">{data.focusTasks.length} in focus</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.completedTasks}</div>
            <p className="text-xs text-muted-foreground">{completionRate}% completion rate</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-blue-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Boards</CardTitle>
            <LayoutGrid className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.activeBoardCount}</div>
            <p className="text-xs text-muted-foreground">Team boards</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-none bg-purple-500/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Bell className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{data.unreadNotifications}</div>
            <Badge variant="secondary" className="mt-1">Unread</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Focus className="size-5 text-primary" />
              Focus Mode
            </CardTitle>
            <Badge variant="outline" className="text-xs">Max 3 tasks</Badge>
          </CardHeader>
          <CardContent>
            {data.focusTasks.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-10">
                No active tasks. Great job!
              </div>
            ) : (
              <div className="space-y-3">
                {data.focusTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-2 rounded-full",
                        task.priority === 'HIGH' || task.priority === 'URGENT' ? "bg-red-500" :
                        task.priority === 'MEDIUM' ? "bg-amber-500" : "bg-green-500"
                      )} />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{task.column.board.name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">{task.column.name}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {data.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {activity.action[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data.myTasks.length > 3 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>All My Tasks ({data.myTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.myTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/board/${task.column.board.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50"
                >
                  <span className="text-sm">{task.title}</span>
                  <Badge variant="outline" className="text-xs">{task.column.name}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}