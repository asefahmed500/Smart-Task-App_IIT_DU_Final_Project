'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Download, X } from "lucide-react"
import { exportAuditLogsToCSV } from '@/actions/admin-actions'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ACTION_TYPES = [
  'CREATE_TASK', 'UPDATE_TASK', 'DELETE_TASK', 'UPDATE_TASK_STATUS',
  'CREATE_COLUMN', 'UPDATE_COLUMN', 'DELETE_COLUMN', 'REORDER_COLUMNS',
  'ADD_COMMENT', 'DELETE_COMMENT', 'ADD_ATTACHMENT', 'DELETE_ATTACHMENT',
  'ADD_TAG', 'REMOVE_TAG', 'CREATE_TAG', 'DELETE_TAG',
  'LOG_TIME', 'UPDATE_TIME_ENTRY', 'DELETE_TIME_ENTRY',
  'SUBMIT_REVIEW', 'COMPLETE_REVIEW',
  'CREATE_BOARD', 'UPDATE_BOARD', 'DELETE_BOARD',
  'ADD_BOARD_MEMBER', 'REMOVE_BOARD_MEMBER',
  'CREATE_AUTOMATION_RULE', 'UPDATE_AUTOMATION_RULE', 'DELETE_AUTOMATION_RULE',
  'TOGGLE_AUTOMATION_RULE', 'AUTOMATION_EXECUTED',
  'CREATE_USER', 'UPDATE_USER_ROLE', 'UPDATE_USER_DETAILS', 'DELETE_USER',
  'LOGIN', 'LOGOUT', 'UNDO',
]

interface AuditLogControlsProps {
  onSearch: (query: string) => void
  onActionFilter: (action: string | null) => void
  onDateFilter: (from: string | null, to: string | null) => void
  selectedAction: string | null
  dateFrom: string | null
  dateTo: string | null
}

export function AuditLogControls({ onSearch, onActionFilter, onDateFilter, selectedAction, dateFrom, dateTo }: AuditLogControlsProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [localFrom, setLocalFrom] = useState(dateFrom || '')
  const [localTo, setLocalTo] = useState(dateTo || '')

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await exportAuditLogsToCSV()
      if (result.success && result.data) {
        const blob = new Blob([result.data as string], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        toast.success('Audit logs exported successfully')
      } else {
        toast.error(result.error || 'Failed to export logs')
      }
    } catch (error) {
      toast.error('An error occurred during export')
    } finally {
      setIsExporting(false)
    }
  }

  const applyDateFilter = () => {
    onDateFilter(localFrom || null, localTo || null)
  }

  const clearFilters = () => {
    onActionFilter(null)
    onDateFilter(null, null)
    setLocalFrom('')
    setLocalTo('')
  }

  const hasFilters = selectedAction || dateFrom || dateTo

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight font-oswald uppercase">System <span className="text-primary">Audit Trail</span></h1>
          <p className="text-muted-foreground">Immutable record of every administrative and system action.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={clearFilters}>
              <X className="size-4" /> Clear Filters
            </Button>
          )}
          <Button 
            variant="outline" 
            className="gap-2" 
            onClick={handleExport}
            disabled={isExporting}
          >
            <Download className="size-4" /> 
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search logs by user, action, or details..." 
            className="pl-10 bg-background/50 backdrop-blur-sm"
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <Button 
          variant={showFilters ? "default" : "secondary"} 
          className="gap-2" 
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="size-4" /> {showFilters ? 'Hide Filters' : 'Advanced Filters'}
        </Button>
      </div>

      {showFilters && (
        <div className="grid gap-4 md:grid-cols-3 p-4 rounded-lg border border-primary/10 bg-muted/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action Type</label>
            <Select value={selectedAction || 'all'} onValueChange={(val) => onActionFilter(val === 'all' ? null : val)}>
              <SelectTrigger className="bg-background/50 border-primary/10">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {ACTION_TYPES.map((action) => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">From Date</label>
            <Input 
              type="date" 
              value={localFrom} 
              onChange={(e) => setLocalFrom(e.target.value)}
              className="bg-background/50 border-primary/10"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">To Date</label>
            <div className="flex gap-2">
              <Input 
                type="date" 
                value={localTo} 
                onChange={(e) => setLocalTo(e.target.value)}
                className="bg-background/50 border-primary/10 flex-1"
              />
              <Button size="sm" onClick={applyDateFilter} className="h-9">Apply</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
