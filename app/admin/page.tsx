import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { getAdminStats, getAuditLogs } from '@/actions/admin-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Users, Layout, ShieldCheck, Activity, TrendingUp, Clock } from 'lucide-react'
import Link from 'next/link'
import { SystemActivityChart } from '@/components/admin/activity-chart'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/utils/utils'

const ACTION_LABELS: Record<string, string> = {
  CREATE_TASK: 'Created task',
  UPDATE_TASK: 'Updated task',
  DELETE_TASK: 'Deleted task',
  UPDATE_TASK_STATUS: 'Moved task',
  UPDATE_TASK_STATUS_OVERRIDE: 'Overrode task status',
  CREATE_COLUMN: 'Created column',
  UPDATE_COLUMN: 'Updated column',
  DELETE_COLUMN: 'Deleted column',
  REORDER_COLUMNS: 'Reordered columns',
  ADD_COMMENT: 'Commented',
  DELETE_COMMENT: 'Deleted comment',
  ADD_ATTACHMENT: 'Added attachment',
  DELETE_ATTACHMENT: 'Deleted attachment',
  ADD_TAG: 'Added tag',
  REMOVE_TAG: 'Removed tag',
  CREATE_TAG: 'Created tag',
  DELETE_TAG: 'Deleted tag',
  LOG_TIME: 'Logged time',
  UPDATE_TIME_ENTRY: 'Updated time entry',
  DELETE_TIME_ENTRY: 'Deleted time entry',
  SUBMIT_REVIEW: 'Submitted review',
  COMPLETE_REVIEW: 'Completed review',
  CREATE_BOARD: 'Created board',
  UPDATE_BOARD: 'Updated board',
  DELETE_BOARD: 'Deleted board',
  ADD_BOARD_MEMBER: 'Added member',
  REMOVE_BOARD_MEMBER: 'Removed member',
  CREATE_AUTOMATION_RULE: 'Created rule',
  UPDATE_AUTOMATION_RULE: 'Updated rule',
  DELETE_AUTOMATION_RULE: 'Deleted rule',
  TOGGLE_AUTOMATION_RULE: 'Toggled rule',
  AUTOMATION_EXECUTED: 'Automation ran',
  CREATE_USER: 'Created user',
  UPDATE_USER_ROLE: 'Changed role',
  UPDATE_USER_DETAILS: 'Updated details',
  DELETE_USER: 'Deleted user',
  LOGIN: 'Signed in',
  LOGOUT: 'Signed out',
  UNDO: 'Undid action',
}

function formatLogDescription(log: any): string {
  const prefix = ACTION_LABELS[log.action] || log.action.replace(/_/g, ' ').toLowerCase()
  const details = log.details || {}
  const parts: string[] = [prefix]
  if (details.taskTitle) parts.push(`"${details.taskTitle}"`)
  if (details.boardName) parts.push(`on "${details.boardName}"`)
  if (details.ruleName) parts.push(`"${details.ruleName}"`)
  if (details.newRole) parts.push(`→ ${details.newRole}`)
  if (details.email) parts.push(`(${details.email})`)
  return parts.join(' ')
}

export default async function AdminPage() {
  const session = await getSession()

  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  const statsResult = await getAdminStats()
  const recentLogsResult = await getAuditLogs()

  const stats = statsResult.success ? (statsResult.data as any) : { 
    userCount: 0, 
    boardCount: 0, 
    logCount: 0, 
    dbStatus: 'UNKNOWN', 
    latency: 'N/A',
    activityData: [] 
  }
  const recentLogs = recentLogsResult.success ? (recentLogsResult.data as any[]) : []

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-[#1A1A1A]">System Intelligence</h1>
        <p className="text-[14px] text-[#5A5A5A]">Centralized oversight and resource optimization.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Total Users</CardTitle>
            <Users className="size-4 text-[#2C67F2]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{stats.userCount}</div>
            <div className="flex items-center gap-1 mt-1.5">
              <TrendingUp className="size-3 text-[#22C55E]" />
              <span className="text-[12px] text-[#22C55E] font-medium">+2.5%</span>
              <span className="text-[12px] text-[#5A5A5A]">this month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Active Boards</CardTitle>
            <Layout className="size-4 text-[#2C67F2]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{stats.boardCount}</div>
            <p className="text-[12px] text-[#5A5A5A] mt-1.5">Global distribution</p>
          </CardContent>
        </Card>

        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">Audit Events</CardTitle>
            <ShieldCheck className="size-4 text-[#2C67F2]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#1A1A1A]">{stats.logCount}</div>
            <p className="text-[12px] text-[#5A5A5A] mt-1.5">Last 24 hours activity</p>
          </CardContent>
        </Card>

        <Card className="border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[13px] font-semibold text-[#5A5A5A]">System Health</CardTitle>
            <Activity className="size-4 text-[#2C67F2]" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", stats.dbStatus === 'STABLE' ? "text-[#22C55E]" : "text-[#F59E0B]")}>
              {stats.dbStatus}
            </div>
            <p className="text-[12px] text-[#5A5A5A] mt-1.5">Latency: {stats.latency}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 border border-[#E8E8E8] shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
              <TrendingUp className="size-4 text-[#2C67F2]" />
              System Activity Trend
            </CardTitle>
            <CardDescription className="text-[13px] text-[#5A5A5A]">Audit log events over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <SystemActivityChart data={stats.activityData} />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 border border-[#E8E8E8] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#1A1A1A]">Recent Activity</CardTitle>
            <Link href="/admin/logs" className="text-[12px] text-[#2C67F2] hover:underline font-medium">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentLogs.slice(0, 5).map((log, index) => (
                <div key={log.id} className="flex gap-3 group/item">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="size-8 rounded-full bg-[#2C67F2]/5 border border-[#E8E8E8] flex items-center justify-center shrink-0">
                      <Clock className="size-3.5 text-[#2C67F2]" />
                    </div>
                    {index !== 4 && <div className="w-px h-full bg-[#E8E8E8]" />}
                  </div>
                  <div className="flex flex-col gap-0.5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#1A1A1A]">{log.user.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-mono text-[#5A5A5A] border-[#E8E8E8]">
                        {log.action}
                      </Badge>
                    </div>
                    <p className="text-[12px] text-[#5A5A5A]">{formatLogDescription(log)}</p>
                    <span className="text-[11px] text-[#B0B0B0]">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
