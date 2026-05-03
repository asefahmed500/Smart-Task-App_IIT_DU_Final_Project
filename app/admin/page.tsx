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
        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-md border-primary/10 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(var(--primary),0.1)] group">
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

        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-md border-primary/10 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(var(--primary),0.1)] group">
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

        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-md border-primary/10 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(var(--primary),0.1)] group">
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

        <Card className="relative overflow-hidden bg-card/50 backdrop-blur-md border-primary/10 transition-all hover:border-primary/40 hover:shadow-[0_0_20px_rgba(var(--primary),0.1)] group">
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
                      Executed system action on target entities.
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

