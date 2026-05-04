import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface ReportData {
  metrics: { title: string; value: string; change: string }[]
  throughputData: { name: string; value: number }[]
  avgLeadTime: string
  avgCycleTime: string
}

export function exportReportToPDF(data: ReportData, title: string) {
  const doc = new jsPDF()

  doc.setFontSize(18)
  doc.text(title, 14, 22)

  doc.setFontSize(11)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)

  // Metrics table
  autoTable(doc, {
    startY: 40,
    head: [["Metric", "Value", "Trend"]],
    body: data.metrics.map((m) => [m.title, m.value, m.change]),
    theme: "striped",
    headStyles: { fillColor: [66, 66, 66] },
  })

  // Throughput table
  if (data.throughputData.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Date", "Tasks Completed"]],
      body: data.throughputData.map((d) => [d.name, d.value.toString()]),
      theme: "striped",
      headStyles: { fillColor: [66, 66, 66] },
    })
  }

  doc.save(`${title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`)
}

export function exportReportToCSV(data: ReportData) {
  const headers = ["Metric", "Value", "Trend"]
  const rows = data.metrics.map((m) => [m.title, m.value, m.change])

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    "",
    "Date,Tasks Completed",
    ...data.throughputData.map((d) => `${d.name},${d.value}`),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.setAttribute(
    "download",
    `report_${new Date().toISOString().split("T")[0]}.csv`
  )
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
