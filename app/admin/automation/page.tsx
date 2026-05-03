import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { getAutomationRules, getAdminStats } from '@/actions/admin-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Cpu, Zap, AlertCircle, Power } from "lucide-react"
import { AddRuleDialog } from "@/components/admin/add-rule-dialog"
import { AutomationRuleList } from "@/components/admin/automation-rule-list"

export default async function AutomationPage() {
  const session = await getSession()

  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  const rulesResult = await getAutomationRules()
  const statsResult = await getAdminStats()

  const rules = rulesResult.success ? (rulesResult.data as any[]) : []
  const stats = statsResult.success ? (statsResult.data as any) : { automationExecCount: 0, totalRules: 0, activeRules: 0, errorRate: 0 }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight font-oswald uppercase">Workflow <span className="text-primary">Automation</span></h1>
          <p className="text-muted-foreground">Configure intelligent triggers and actions for the entire platform.</p>
        </div>
        <AddRuleDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
              <Zap className="size-4 text-yellow-500" />
              Active Engines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.filter(r => r.enabled).length}</div>
            <p className="text-xs text-muted-foreground mt-1 text-green-500 font-medium">Running successfully</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/10 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="size-4 text-primary" />
              Executions (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.execCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Average latency: 120ms</p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-primary/10 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider flex items-center gap-2">
              <Power className="size-4 text-muted-foreground" />
              Total Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rules.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Global & Board-level</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/40 backdrop-blur-xl border-primary/10 shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-oswald uppercase flex items-center gap-2">
            <Cpu className="size-5 text-primary" />
            Global Directives
          </CardTitle>
          <CardDescription>Rules defined here apply to all boards across the system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <AutomationRuleList rules={rules} />
        </CardContent>
      </Card>
    </div>
  )
}
