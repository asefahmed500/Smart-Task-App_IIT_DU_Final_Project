import { getSystemReports } from "@/lib/admin-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Clock, AlertTriangle, Layers, Layout, Users } from "lucide-react"
import { SystemActivityChart } from "@/components/admin/activity-chart"

const iconMap = {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  Layers,
  Layout,
  Users
}

type IconKey = keyof typeof iconMap

interface ReportMetric {
  title: string
  value: string
  change: string
  icon: string
  color: string
}

export default async function ReportsPage() {
  const { metrics, throughputData } = await getSystemReports()

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight font-oswald uppercase">System <span className="text-primary">Intelligence</span></h1>
        <p className="text-muted-foreground">High-level overview of organizational productivity and flow metrics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m: ReportMetric) => {
          const Icon = iconMap[m.icon as IconKey] || BarChart3
          return (
            <Card key={m.title} className="bg-card/50 backdrop-blur-sm border-primary/10 hover:border-primary/30 transition-all">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{m.title}</CardTitle>
                <Icon className={`h-4 w-4 ${m.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{m.value}</div>
                <p className={`text-xs mt-1 ${m.change.startsWith('+') ? 'text-green-500' : m.change.startsWith('-') ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {m.change}
                </p>
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
