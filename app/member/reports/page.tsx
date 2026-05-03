'use client'

import { useState, useEffect } from 'react'
import { getMemberStats } from '@/actions/member-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, ListChecks, Activity, TrendingUp, Clock, Zap, Target, Star } from "lucide-react"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts'

export default function MemberReportsPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMemberStats().then((res) => {
      if (res.success) {
        setStats(res.data)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Calculating your impact...</div>

  const productivityData = stats?.productivityData || [
    { day: 'Mon', tasks: 0 },
    { day: 'Tue', tasks: 0 },
    { day: 'Wed', tasks: 0 },
    { day: 'Thu', tasks: 0 },
    { day: 'Fri', tasks: 0 },
    { day: 'Sat', tasks: 0 },
    { day: 'Sun', tasks: 0 },
  ]

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Performance Report</h1>
        <p className="text-muted-foreground">Insights into your personal productivity and task completion.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Assigned Tasks</CardTitle>
            <ListChecks className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Total tasks in pipeline</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.completedTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully resolved</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Zap className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.activeTasks || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Activity className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats?.recentActivityCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Actions in last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm border-primary/5">
          <CardHeader>
            <CardTitle>Personal Velocity</CardTitle>
            <CardDescription>Daily task completion history.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={productivityData}>
                <defs>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <YAxis axisLine={false} tickLine={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="tasks" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorTasks)" 
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm border-primary/5">
          <CardHeader>
            <CardTitle>Efficiency Targets</CardTitle>
            <CardDescription>Your performance against team benchmarks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                { label: 'Completion Speed', value: stats?.completionSpeed || 0, icon: Clock, color: 'text-blue-500' },
                { label: 'Accuracy Rate', value: stats?.accuracyRate || 0, icon: Target, color: 'text-green-500' },
                { label: 'Team Collaboration', value: stats?.collaborationRate || 0, icon: Star, color: 'text-amber-500' },
                { label: 'Consistency', value: stats?.consistencyScore || 0, icon: TrendingUp, color: 'text-purple-500' },
              ].map((metric) => (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <metric.icon className={`size-4 ${metric.color}`} />
                      <span className="font-medium">{metric.label}</span>
                    </div>
                    <span className="font-bold">{metric.value}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 bg-primary`} 
                      style={{ width: `${metric.value}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground italic leading-relaxed text-center">
                {stats?.completedTasks > 0 
                  ? `You've completed ${stats.completedTasks} tasks so far. ${stats.accuracyRate > 90 ? "Your attention to detail is exceptional!" : "Focus on completing your checklists to boost your accuracy."}`
                  : "Start completing tasks to see your performance insights here. Your journey to peak productivity begins today!"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
