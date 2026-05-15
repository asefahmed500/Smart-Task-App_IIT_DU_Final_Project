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

const ACTION_LABELS: Record<string, string> = {
  CREATE_TASK: 'Created a task',
  UPDATE_TASK: 'Updated a task',
  DELETE_TASK: 'Deleted a task',
  UPDATE_TASK_STATUS: 'Moved task status',
  UPDATE_TASK_STATUS_OVERRIDE: 'Overrode task status',
  CREATE_COLUMN: 'Created a column',
  UPDATE_COLUMN: 'Updated a column',
  DELETE_COLUMN: 'Deleted a column',
  REORDER_COLUMNS: 'Reordered columns',
  ADD_COMMENT: 'Added a comment',
  DELETE_COMMENT: 'Deleted a comment',
  ADD_ATTACHMENT: 'Added an attachment',
  DELETE_ATTACHMENT: 'Deleted an attachment',
  ADD_TAG: 'Added a tag',
  REMOVE_TAG: 'Removed a tag',
  CREATE_TAG: 'Created a tag',
  DELETE_TAG: 'Deleted a tag',
  LOG_TIME: 'Logged time',
  UPDATE_TIME_ENTRY: 'Updated time entry',
  DELETE_TIME_ENTRY: 'Deleted time entry',
  SUBMIT_REVIEW: 'Submitted a review',
  COMPLETE_REVIEW: 'Completed a review',
  CREATE_BOARD: 'Created a board',
  UPDATE_BOARD: 'Updated a board',
  DELETE_BOARD: 'Deleted a board',
  ADD_BOARD_MEMBER: 'Added board member',
  REMOVE_BOARD_MEMBER: 'Removed board member',
  CREATE_AUTOMATION_RULE: 'Created automation rule',
  UPDATE_AUTOMATION_RULE: 'Updated automation rule',
  DELETE_AUTOMATION_RULE: 'Deleted automation rule',
  TOGGLE_AUTOMATION_RULE: 'Toggled automation rule',
  AUTOMATION_EXECUTED: 'Automation executed',
  CREATE_USER: 'Created a user',
  UPDATE_USER_ROLE: 'Updated user role',
  UPDATE_USER_DETAILS: 'Updated user details',
  DELETE_USER: 'Deleted a user',
  LOGIN: 'Logged in',
  LOGOUT: 'Logged out',
  UNDO: 'Undid an action',
}

function formatActionDescription(action: string, details: Record<string, any>): string {
  const label = ACTION_LABELS[action]
  if (!label) return action.replace(/_/g, ' ').toLowerCase()

  const parts: string[] = [label]

  if (details.taskTitle) parts.push(`"${details.taskTitle}"`)
  else if (details.taskId) parts.push(`task ${details.taskId.slice(0, 8)}`)

  if (details.boardName) parts.push(`on "${details.boardName}"`)
  else if (details.boardId) parts.push(`on board ${details.boardId.slice(0, 8)}`)

  if (details.newRole) parts.push(`→ ${details.newRole}`)
  if (details.targetUserId) {
    const id = typeof details.targetUserId === 'string' ? details.targetUserId.slice(0, 8) : ''
    if (action.includes('USER')) parts.push(`(user ${id})`)
  }
  if (details.email) parts.push(`(${details.email})`)
  if (details.newStatus) parts.push(`→ ${details.newStatus}`)
  if (details.ruleName) parts.push(`"${details.ruleName}"`)
  if (details.enabled !== undefined) parts.push(details.enabled ? '→ enabled' : '→ disabled')
  if (details.name && !details.ruleName) parts.push(`"${details.name}"`)

  return parts.join(' ')
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-500/10 text-green-600 border-green-500/20',
  UPDATE: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
  ADD: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  REMOVE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  LOGIN: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  LOGOUT: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  UNDO: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  AUTOMATION: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  TOGGLE: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  LOG: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  SUBMIT: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  COMPLETE: 'bg-green-500/10 text-green-600 border-green-500/20',
  REORDER: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
}

function getActionBadgeClass(action: string): string {
  const prefix = action.split('_')[0]
  return ACTION_COLORS[prefix] || 'bg-muted text-muted-foreground border-border'
}

export function AuditLogManager({ initialLogs }: AuditLogManagerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState<string | null>(null)
  const [dateTo, setDateTo] = useState<string | null>(null)

  const filteredLogs = useMemo(() => {
    return initialLogs.filter(log => {
      const description = formatActionDescription(log.action, log.details || {})
      const matchesSearch = 
        !searchQuery ||
        log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase())

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
                <TableHead>Details</TableHead>
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
                        <span className="text-sm font-bold leading-none">{log.user?.name || 'System'}</span>
                        <span className="text-[10px] text-muted-foreground">{log.user?.email || 'automated'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`font-mono text-[10px] uppercase ${getActionBadgeClass(log.action)}`}>
                      {log.action.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm text-foreground leading-relaxed max-w-[400px]">
                      {formatActionDescription(log.action, log.details || {})}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
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