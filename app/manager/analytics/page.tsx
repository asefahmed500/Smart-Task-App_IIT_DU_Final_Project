'use client'

import { useState, useEffect } from 'react'
import { getManagerAnalytics, getManagerBoards } from '@/actions/manager-actions'
import { getAdvancedReports } from '@/actions/dashboard-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Clock, CheckCircle2, AlertCircle, PieChart, Calendar, ArrowUpRight, ArrowDownRight, ChevronDown, Filter, RefreshCw, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ReportExportButtons } from "@/components/report-export-buttons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart as RePieChart,
  Pie
} from 'recharts'

export default function ManagerAnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [boards, setBoards] = useState<any[]>([])
  const [selectedBoardId, setSelectedBoardId] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Initial load: boards and global analytics
    Promise.all([getManagerAnalytics(), getManagerBoards()])
      .then(([analyticsRes, boardsRes]) => {
        if (analyticsRes.success) setData(analyticsRes.data)
        if (boardsRes.success) setBoards(boardsRes.data)
      })
      .catch(() => setError('Failed to load initial data'))
      .finally(() => setLoading(false))
  }, [])

  const handleBoardChange = async (boardId: string) => {
    setSelectedBoardId(boardId)
    setLoading(true)
    try {
      if (boardId === "all") {
        const res = await getManagerAnalytics()
        if (res.success) setData(res.data)
      } else {
        const res = await getAdvancedReports(boardId)
        if (res.success) {
          // Adapt getAdvancedReports data to match the UI's expected format if necessary
          // getAdvancedReports returns { averageLeadTime, averageCycleTime, bottleneckData, throughputData, totalTasks, completedTasks }
          // ManagerAnalytics expects { throughput, avgCycleTime, avgLeadTime, distribution, bottlenecks, boardStats, totalCompleted, overallCompletionRate }
          const advData = res.data
          setData({
            throughput: advData.throughputData.map((d: any) => ({
              name: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
              value: d.count
            })),
            avgCycleTime: advData.averageCycleTime.toFixed(1),
            avgLeadTime: advData.averageLeadTime.toFixed(1),
            distribution: [], // advanced reports doesn't have distribution yet, but we can live without it or add it
            bottlenecks: advData.bottleneckData.map((b: any) => ({
              columnName: b.name,
              taskCount: 0, // not directly in advanced reports summary
              isBottleneck: b.averageDuration > 48
            })),
            boardStats: [],
            totalCompleted: advData.completedTasks,
            overallCompletionRate: Math.round((advData.completedTasks / advData.totalTasks) * 100) || 0,
            isAdvanced: true, // Flag for UI differences
            advancedData: advData
          })
        }
      }
    } catch (err) {
      setError('Failed to refresh data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground animate-pulse">Analyzing board performance...</p>
        </div>
      </div>
    )
  }

  if (error || !data || data.empty) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="size-20 bg-muted rounded-full flex items-center justify-center">
          <BarChart3 className="size-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">No Data Available</h2>
        <p className="text-muted-foreground max-w-md">
          {error || "We couldn't find any task activity on your boards. Start moving tasks to see performance metrics here."}
        </p>
      </div>
    )
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Board Analytics</h1>
          <p className="text-muted-foreground">Real-time performance metrics and flow analysis across your projects.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => handleBoardChange(selectedBoardId)}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ReportExportButtons
            metrics={[
              { title: "Completion Rate", value: `${data.overallCompletionRate}%`, change: "N/A" },
              { title: "Total Throughput", value: `${data.totalCompleted}`, change: "N/A" },
              { title: "Avg Cycle Time", value: `${data.avgCycleTime}d`, change: "N/A" },
              { title: "Avg Lead Time", value: `${data.avgLeadTime}d`, change: "N/A" },
            ]}
            throughputData={data.throughput || []}
            title="Manager Analytics Report"
            avgLeadTime={`${data.avgLeadTime}d`}
            avgCycleTime={`${data.avgCycleTime}d`}
          />
          <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-2 shadow-sm">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Filter by Board:</span>
            <Select value={selectedBoardId} onValueChange={handleBoardChange}>
              <SelectTrigger className="w-[200px] h-8 border-none focus:ring-0 bg-transparent p-0 shadow-none">
                <SelectValue placeholder="All Boards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Boards (Overview)</SelectItem>
                {boards.map(board => (
                  <SelectItem key={board.id} value={board.id}>{board.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary/5 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overallCompletionRate}%</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              Avg. across all boards
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Throughput</CardTitle>
            <CheckCircle2 className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalCompleted}</div>
            <p className="text-xs text-muted-foreground mt-1">Total tasks completed</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Cycle Time</CardTitle>
            <Clock className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgCycleTime}d</div>
            <p className="text-xs text-muted-foreground mt-1">Time from start to finish</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Potential Bottlenecks</CardTitle>
            <AlertCircle className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.bottlenecks.length}</div>
            <Badge variant="secondary" className="mt-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
              {data.bottlenecks.length > 0 ? "Review Required" : "Flow is healthy"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Throughput Trend</CardTitle>
                <CardDescription>Daily completed tasks over the last 7 days.</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-muted/30">
                <Calendar className="size-3.5" />
                Last 7 Days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.throughput}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                <XAxis 
                  dataKey="name" 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Tasks Completed"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle>Board Progress</CardTitle>
            <CardDescription>Completion status across active boards.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.boardStats?.slice(0, 5).map((board: any, index: number) => (
                <div key={board.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate max-w-[200px]">{board.name}</span>
                    <span className="text-muted-foreground font-bold">{board.completionRate}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out" 
                      style={{ 
                        width: `${board.completionRate}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }} 
                    />
                  </div>
                </div>
              ))}
              {(!data.boardStats || data.boardStats.length === 0) && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PieChart className="size-12 opacity-10 mb-4" />
                  <p className="text-sm text-muted-foreground">Insufficient data for board comparison</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5 text-primary" />
              Lead Time Analysis
            </CardTitle>
            <CardDescription>Avg. days from creation to completion.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[300px]">
             <div className="text-6xl font-bold text-primary mb-2">{data.avgLeadTime}d</div>
             <p className="text-muted-foreground">Average Lead Time</p>
             <div className="mt-8 grid grid-cols-2 gap-8 text-center w-full max-w-sm">
                <div>
                  <div className="text-xl font-semibold">{data.avgCycleTime}d</div>
                  <div className="text-xs text-muted-foreground">Cycle Time</div>
                </div>
                <div>
                  <div className="text-xl font-semibold">
                    {(parseFloat(data.avgLeadTime) - parseFloat(data.avgCycleTime)).toFixed(1)}d
                  </div>
                  <div className="text-xs text-muted-foreground">Queue Time</div>
                </div>
             </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm border-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="size-5 text-primary" />
              Task Distribution
            </CardTitle>
            <CardDescription>Tasks across all status categories.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={data.distribution}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.distribution.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 ml-4">
              {data.distribution.map((item: any, index: number) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="size-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {data.bottlenecks.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-amber-700 flex items-center gap-2">
              <AlertCircle className="size-5" />
              Efficiency Bottlenecks Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.bottlenecks.map((b: any, i: number) => (
                <div key={i} className="p-4 bg-background rounded-lg border border-amber-500/10 shadow-sm">
                  <div className="text-xs text-muted-foreground mb-1">{b.boardName || selectedBoardId}</div>
                  <div className="font-semibold mb-2">{b.columnName}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">
                      {data.isAdvanced ? `${b.averageDuration?.toFixed(1)} hrs avg` : `${b.taskCount} tasks`}
                    </span>
                    <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">
                      {data.isAdvanced ? (b.averageDuration > 48 ? 'HIGH BOTTLE' : 'BOTTLE') : `WIP LIMIT: ${b.wipLimit || 10}`}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Leaderboard */}
      {data.advancedData?.priorityBreakdown && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              Completion by Priority
            </CardTitle>
            <CardDescription>Average completion time per priority level.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.advancedData.priorityBreakdown.map((item: any, index: number) => (
                <div key={item.priority} className="flex items-center justify-between p-3 rounded-lg border border-primary/5 bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      item.priority === 'URGENT' ? 'bg-red-500/10 text-red-500' :
                      item.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500' :
                      item.priority === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-500' :
                      'bg-blue-500/10 text-blue-500'
                    }`}>
                      {item.priority[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.priority}</p>
                      <p className="text-xs text-muted-foreground">{item.count} tasks</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{item.avgCompletionTime?.toFixed(1)}d</p>
                    <p className="text-[10px] text-muted-foreground">avg completion</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignee Leaderboard */}
      {data.advancedData?.assigneeLeaderboard && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Team Leaderboard
            </CardTitle>
            <CardDescription>Tasks completed by team member.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.advancedData.assigneeLeaderboard.map((item: any, index: number) => (
                <div key={item.userId} className="flex items-center justify-between p-3 rounded-lg border border-primary/5 bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold">{item.completed}</p>
                      <p className="text-[10px] text-muted-foreground">completed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{item.avgCycleTime?.toFixed(1)}d</p>
                      <p className="text-[10px] text-muted-foreground">avg cycle</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
