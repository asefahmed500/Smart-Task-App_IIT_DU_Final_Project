import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getAuditLogs } from '@/lib/admin-actions'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ShieldCheck, Search, Filter, Download, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDistanceToNow } from 'date-fns'

export default async function AuditLogsPage() {
  const session = await getSession()

  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  const logs = await getAuditLogs()

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight font-oswald uppercase">System <span className="text-primary">Audit Trail</span></h1>
          <p className="text-muted-foreground">Immutable record of every administrative and system action.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search logs by user, action, or details..." 
            className="pl-10 bg-background/50 backdrop-blur-sm"
          />
        </div>
        <Button variant="secondary" className="gap-2">
          <Filter className="size-4" /> Advanced Filters
        </Button>
      </div>

      <Card className="bg-card/50 backdrop-blur-md border-primary/10 shadow-xl overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-oswald uppercase flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Active Surveillance
          </CardTitle>
          <CardDescription>Displaying the latest 50 security events.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Operation</TableHead>
                <TableHead>Parameters</TableHead>
                <TableHead className="text-right">Origin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    <div className="flex flex-col">
                      <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                      <span className="opacity-60">{new Date(log.createdAt).toLocaleTimeString()}</span>
                      <span className="text-[10px] text-primary/60 mt-1">
                        {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="size-7 rounded-full bg-accent flex items-center justify-center">
                        <User className="size-3 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold leading-none">{log.user.name}</span>
                        <span className="text-[10px] text-muted-foreground">{log.user.email}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] uppercase bg-background/50 group-hover:bg-primary/10 transition-colors">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[300px] truncate">
                      <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                        {JSON.stringify(log.details)}
                      </code>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      {log.ipAddress || 'INTERNAL'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
