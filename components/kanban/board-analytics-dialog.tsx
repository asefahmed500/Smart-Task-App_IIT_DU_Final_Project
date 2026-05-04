'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  PieChart,
  Pie
} from 'recharts'
import { getAdvancedReports } from '@/actions/dashboard-actions'
import { Clock, TrendingUp, AlertCircle, Calendar, BarChart3, Loader2 } from 'lucide-react'


interface BoardAnalyticsDialogProps {
  isOpen: boolean
  onClose: () => void
  boardId: string
  boardName: string
}

export function BoardAnalyticsDialog({ isOpen, onClose, boardId, boardName }: BoardAnalyticsDialogProps) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      getAdvancedReports(boardId)
        .then(res => {
          if (res.success) {
            setData(res.data)
          } else {
            setError(res.error || 'Failed to load report')
          }
        })
        .catch(() => setError('An unexpected error occurred'))
        .finally(() => setLoading(false))
    }
  }, [isOpen, boardId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl max-h-[90vh] bg-card rounded-2xl border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b flex items-center justify-between bg-primary/5">
          <div>
            <h2 className="text-2xl font-bold tracking-tight uppercase font-oswald">{boardName} Analytics</h2>
            <p className="text-sm text-muted-foreground">Deep dive into workflow efficiency and delivery metrics.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <span className="sr-only">Close</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-muted-foreground">Generating advanced metrics...</p>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-center">
              <AlertCircle className="size-12 text-destructive opacity-50" />
              <p className="text-lg font-medium">{error}</p>
              <Button onClick={onClose}>Close</Button>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-blue-500/5 border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-blue-600 uppercase tracking-wider">Avg. Cycle Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.averageCycleTime.toFixed(1)}d</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Start to Finish</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-500/5 border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-purple-600 uppercase tracking-wider">Avg. Lead Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.averageLeadTime.toFixed(1)}d</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Creation to Done</p>
                  </CardContent>
                </Card>
                <Card className="bg-green-500/5 border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-green-600 uppercase tracking-wider">Throughput</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.completedTasks}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Tasks completed (30d)</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-none">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-amber-600 uppercase tracking-wider">Total Tasks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.totalTasks}</div>
                    <p className="text-[10px] text-muted-foreground mt-1">Active + Completed</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Throughput Chart */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="size-4 text-primary" />
                      30-Day Throughput
                    </CardTitle>
                    <CardDescription>Daily task completions over the last month.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.throughputData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                        <XAxis 
                          dataKey="date" 
                          fontSize={10} 
                          tickFormatter={(str) => new Date(str).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                          stroke="hsl(var(--muted-foreground))"
                        />
                        <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Bottleneck Analysis */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="size-4 text-amber-500" />
                      Flow Efficiency (Bottlenecks)
                    </CardTitle>
                    <CardDescription>Average hours spent in each column.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={data.bottleneckData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--muted))" />
                        <XAxis type="number" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                        <YAxis dataKey="name" type="category" fontSize={10} width={80} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Bar dataKey="averageDuration" name="Avg Hours" radius={[0, 4, 4, 0]}>
                          {data.bottleneckData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.averageDuration > 48 ? '#ef4444' : entry.averageDuration > 24 ? '#f59e0b' : '#3b82f6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Lead vs Cycle Breakdown */}
              <Card className="border-primary/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider">Metric Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/30 rounded-xl space-y-1 border border-primary/5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Cycle Time Efficiency</span>
                          <span className="text-xs font-bold text-primary">{Math.round((data.averageCycleTime / data.averageLeadTime) * 100 || 0)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${(data.averageCycleTime / data.averageLeadTime) * 100 || 0}%` }} 
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground pt-1">
                          Percentage of lead time spent actively working on tasks.
                        </p>
                      </div>
                      
                      <div className="p-4 bg-muted/30 rounded-xl space-y-1 border border-primary/5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Wait/Queue Time</span>
                          <span className="text-xs font-bold text-amber-600">{(data.averageLeadTime - data.averageCycleTime).toFixed(1)} days</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground pt-1">
                          Average time tasks spend in the backlog or queue before being started.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center text-center p-6 bg-primary/5 rounded-2xl border border-primary/10">
                       <BarChart3 className="size-12 text-primary opacity-20 mb-4" />
                       <h3 className="font-bold">Optimization Tip</h3>
                       <p className="text-sm text-muted-foreground max-w-xs mt-1">
                         {data.averageLeadTime > 7 
                           ? "Your lead time is high. Consider reducing work-in-progress (WIP) limits to focus on finishing tasks faster."
                           : "Your team has a healthy flow. Keep monitoring bottlenecks to maintain this momentum."}
                       </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        
        <div className="p-4 border-t bg-muted/20 flex justify-end">
          <Button onClick={onClose} variant="secondary">Close Report</Button>
        </div>
      </div>
    </div>
  )
}
