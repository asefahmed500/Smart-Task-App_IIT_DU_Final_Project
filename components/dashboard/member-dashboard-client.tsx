'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ListTodo, LayoutGrid, Bell, Focus, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/utils/utils'

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
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">Welcome back, {user.name}</h1>
        <p className="text-[14px] text-[#5A5A5A]">Here&apos;s your productivity overview.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Assigned Tasks</CardTitle>
            <ListTodo className="size-4 text-[#2C67F2]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{data.assignedTasks}</div>
            <p className="text-[12px] text-[#5A5A5A] mt-1.5">{data.focusTasks.length} in focus</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Completed</CardTitle>
            <CheckCircle2 className="size-4 text-[#2C67F2]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{data.completedTasks}</div>
            <p className="text-[12px] text-[#5A5A5A] mt-1.5">{completionRate}% completion rate</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Active Boards</CardTitle>
            <LayoutGrid className="size-4 text-[#2C67F2]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{data.activeBoardCount}</div>
            <p className="text-[12px] text-[#5A5A5A] mt-1.5">Team boards</p>
          </CardContent>
        </Card>
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Notifications</CardTitle>
            <Bell className="size-4 text-[#2C67F2]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{data.unreadNotifications}</div>
            <Badge variant="outline" className="mt-1.5 text-[11px] text-[#2C67F2] border-[#2C67F2]/20 bg-[#2C67F2]/5">Unread</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
              <Focus className="size-4 text-[#2C67F2]" />
              Focus Mode
            </CardTitle>
            <Badge variant="outline" className="text-[11px] text-[#5A5A5A] border-[#E8E8E8]">Max 3 tasks</Badge>
          </CardHeader>
          <CardContent>
            {data.focusTasks.length === 0 ? (
              <div className="text-sm text-[#5A5A5A] text-center py-10">
                No active tasks. Great job!
              </div>
            ) : (
              <div className="space-y-2">
                {data.focusTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-md border border-[#E8E8E8] hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "size-2 rounded-full",
                        task.priority === 'HIGH' || task.priority === 'URGENT' || task.priority === 'Critical' ? "bg-[#EF4444]" :
                        task.priority === 'MEDIUM' || task.priority === 'High' ? "bg-[#F59E0B]" : "bg-[#22C55E]"
                      )} />
                      <div>
                        <p className="text-[13px] font-semibold text-[#1A1A1A]">{task.title}</p>
                        <p className="text-[12px] text-[#5A5A5A]">{task.column.board.name}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[11px] text-[#5A5A5A] border-[#E8E8E8]">{task.column.name}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-3 border border-[#E8E8E8] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
              <Clock className="size-4 text-[#2C67F2]" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-[#5A5A5A] text-center py-6">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-[#2C67F2]/5 border border-[#E8E8E8] flex items-center justify-center text-[12px] font-semibold text-[#2C67F2]">
                      {activity.action[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1A1A1A] truncate">{activity.action.replace(/_/g, ' ')}</p>
                      <p className="text-[12px] text-[#5A5A5A]">
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
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1A1A1A]">All My Tasks ({data.myTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.myTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/board/${task.column.board.id}`}
                  className="flex items-center justify-between p-2 rounded hover:bg-[#FAFAFA] transition-colors"
                >
                  <span className="text-[13px] text-[#1A1A1A]">{task.title}</span>
                  <Badge variant="outline" className="text-[11px] text-[#5A5A5A] border-[#E8E8E8]">{task.column.name}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
