'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Filter, Download } from "lucide-react"
import { exportAuditLogsToCSV } from '@/actions/admin-actions'
import { toast } from 'sonner'

interface AuditLogControlsProps {
  onSearch: (query: string) => void
  onFilter: () => void
}

export function AuditLogControls({ onSearch, onFilter }: AuditLogControlsProps) {
  const [isExporting, setIsExporting] = useState(false)

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight font-oswald uppercase">System <span className="text-primary">Audit Trail</span></h1>
          <p className="text-muted-foreground">Immutable record of every administrative and system action.</p>
        </div>
        <div className="flex items-center gap-2">
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
        <Button variant="secondary" className="gap-2" onClick={onFilter}>
          <Filter className="size-4" /> Advanced Filters
        </Button>
      </div>
    </div>
  )
}
