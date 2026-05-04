'use client'

import { Button } from "@/components/ui/button"
import { Download, FileText } from "lucide-react"
import { exportReportToPDF, exportReportToCSV } from "@/lib/export-report"

interface ReportExportButtonsProps {
  metrics: { title: string; value: string; change: string }[]
  throughputData: { name: string; value: number }[]
  title: string
  avgLeadTime?: string
  avgCycleTime?: string
}

export function ReportExportButtons({ metrics, throughputData, title, avgLeadTime, avgCycleTime }: ReportExportButtonsProps) {
  const reportData = {
    metrics,
    throughputData,
    avgLeadTime: avgLeadTime || "N/A",
    avgCycleTime: avgCycleTime || "N/A",
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs border-primary/20 hover:bg-primary/5"
        onClick={() => exportReportToCSV(reportData)}
      >
        <FileText className="mr-1.5 size-3.5" />
        Export CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs border-primary/20 hover:bg-primary/5"
        onClick={() => exportReportToPDF(reportData, title)}
      >
        <Download className="mr-1.5 size-3.5" />
        Export PDF
      </Button>
    </div>
  )
}
