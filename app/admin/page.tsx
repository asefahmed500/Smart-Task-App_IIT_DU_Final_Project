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
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight font-oswald uppercase text-foreground">
          System <span className="text-primary">Intelligence</span>
        </h1>
        <p className="text-muted-foreground text-lg">Centralized oversight and resource optimization.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-md border-primary/10 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_color-mix(in_srgb,var(--primary),transparent_90%)] group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Total Users</CardTitle>
            <div className="size-10 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
              <Users className="h-5 w-5 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-oswald">{stats.userCount}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <TrendingUp className="size-3 text-green-500" />
              <span className="text-green-500 font-medium">+2.5%</span>
              <span>this month</span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-md border-primary/10 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_color-mix(in_srgb,var(--primary),transparent_90%)] group">
          <div className="absolute top-0 left-0 w-1 h-full bg-purple-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Active Boards</CardTitle>
            <div className="size-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
              <Layout className="h-5 w-5 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-oswald">{stats.boardCount}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
              <Activity className="size-3 text-purple-500" />
              <span>Global distribution</span>
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-md border-primary/10 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_color-mix(in_srgb,var(--primary),transparent_90%)] group">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Audit Events</CardTitle>
            <div className="size-10 rounded-xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
              <ShieldCheck className="h-5 w-5 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-oswald">{stats.logCount}</div>
            <p className="text-xs text-muted-foreground mt-2">Last 24 hours activity</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-md border-primary/10 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_color-mix(in_srgb,var(--primary),transparent_90%)] group">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">System Health</CardTitle>
            <div className="size-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
              <Activity className="h-5 w-5 text-green-500 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn("text-3xl font-bold font-oswald", stats.dbStatus === 'STABLE' ? "text-green-500" : "text-yellow-500")}>
              {stats.dbStatus}
            </div>
            <p className="text-xs text-muted-foreground mt-2">Latency: {stats.latency}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4 bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden group">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
          <CardHeader>
            <CardTitle className="text-xl font-oswald uppercase flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              System Activity Trend
            </CardTitle>
            <CardDescription>Visualizing global audit log events over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <SystemActivityChart data={stats.activityData} />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-oswald uppercase">Recent Activity</CardTitle>
            <Link href="/admin/logs" className="text-xs text-primary hover:underline font-medium">View All</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentLogs.slice(0, 5).map((log, index) => (
                <div key={log.id} className="flex gap-4 group/item">
                  <div className="flex flex-col items-center gap-2">
                    <div className="size-10 rounded-full bg-accent flex items-center justify-center shrink-0 border border-primary/10 group-hover/item:border-primary/30 transition-all">
                      <Clock className="size-4 text-primary" />
                    </div>
                    {index !== 4 && <div className="w-px h-full bg-border" />}
                  </div>
                  <div className="flex flex-col gap-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{log.user.name}</span>
                      <Badge variant="outline" className="text-[10px] py-0 px-1 font-mono uppercase opacity-70">
                        {log.action}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {formatLogDescription(log)}
                    </p>
                    <span className="text-[10px] text-muted-foreground/60 font-medium">
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

