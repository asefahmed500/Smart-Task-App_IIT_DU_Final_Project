'use client'

import { useState, useMemo } from 'react'
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
import { ShieldCheck, User } from "lucide-react"
import { formatDistanceToNow } from 'date-fns'
import { AuditLogControls } from './audit-log-controls'

interface AuditLogManagerProps {
  initialLogs: any[]
}

export function AuditLogManager({ initialLogs }: AuditLogManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)

  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const matchesSearch = 
        !searchQuery ||
        log.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        JSON.stringify(log.details).toLowerCase().includes(searchQuery.toLowerCase())

      const matchesAction = !selectedAction || log.action === selectedAction

      const logDate = new Date(log.createdAt)
      const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom)
      const matchesDateTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59')

      return matchesSearch && matchesAction && matchesDateFrom && matchesDateTo
    })
  }, [initialLogs, searchQuery, selectedAction, dateFrom, dateTo])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <AuditLogControls
        onSearch={setSearchQuery}
        onActionFilter={setSelectedAction}
        onDateFilter={(from, to) => { setDateFrom(from); setDateTo(to) }}
        selectedAction={selectedAction}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />

      <Card className="bg-card/50 backdrop-blur-md border-primary/10 shadow-xl overflow-hidden">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-lg font-oswald uppercase flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" />
            Active Surveillance
          </CardTitle>
          <CardDescription>
            {filteredLogs.length === initialLogs.length 
              ? `Displaying the latest ${initialLogs.length} security events.`
              : `Found ${filteredLogs.length} matching events.`}
          </CardDescription>
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
              {filteredLogs.map((log) => (
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
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No matching audit logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}


