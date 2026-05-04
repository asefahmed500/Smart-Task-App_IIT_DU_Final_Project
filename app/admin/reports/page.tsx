'use client'

import { useState, useCallback, useEffect } from 'react'
import { getSystemReports } from '@/actions/admin-actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Clock, AlertTriangle, Layers, Layout, Users, Zap, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SystemActivityChart } from "@/components/admin/activity-chart"
import { ReportExportButtons } from "@/components/report-export-buttons"

const iconMap = {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  Layers,
  Layout,
  Users,
  Zap
}

type IconKey = keyof typeof iconMap

interface ReportMetric {
  title: string
  value: string
  change: string
  icon: string
  color: string
}

export default function ReportsPage() {
  const [metrics, setMetrics] = useState<ReportMetric[]>([])
  const [throughputData, setThroughputData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getSystemReports()
      if (result.success && result.data) {
        const data = result.data as { metrics: ReportMetric[], throughputData: any[] }
        setMetrics(data.metrics)
        setThroughputData(data.throughputData)
      }
    } catch (error) {
      console.error('Failed to load reports', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useState(() => {
    loadData()
  })

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight font-oswald uppercase">System <span className="text-primary">Intelligence</span></h1>
          <p className="text-muted-foreground">High-level overview of organizational productivity and flow metrics.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ReportExportButtons
            metrics={metrics}
            throughputData={throughputData}
            title="System Intelligence Report"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m: ReportMetric) => {
          const Icon = iconMap[m.icon as IconKey] || BarChart3
          return (
            <Card key={m.title} className="bg-card/30 backdrop-blur-xl border-primary/5 hover:border-primary/20 hover:bg-primary/5 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 group relative overflow-hidden ring-1 ring-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">{m.title}</CardTitle>
                <div className={`p-2 rounded-xl bg-background/50 border border-primary/10 group-hover:border-primary/30 transition-colors shadow-sm`}>
                  <Icon className={`h-4 w-4 ${m.color} group-hover:scale-110 transition-transform duration-500`} />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-3xl font-bold tracking-tighter">{m.value}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    m.change.startsWith('+') ? 'bg-green-500/10 text-green-500' : 
                    m.change.startsWith('-') ? 'bg-red-500/10 text-red-500' : 
                    'bg-muted text-muted-foreground'
                  }`}>
                    {m.change}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tight">vs last period</span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>


      <div className="grid gap-6 md:grid-cols-1">
        <Card className="bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
          <CardHeader>
            <CardTitle className="text-lg font-oswald uppercase">System Throughput</CardTitle>
            <CardDescription>Number of tasks completed across the entire system over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            <SystemActivityChart data={throughputData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
