import { getSession } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { getManagerAuditLogs } from "@/actions/admin-actions"
import { AuditLogManager } from "@/components/admin/audit-log-manager"

export default async function ManagerLogsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "MANAGER" && session.role !== "ADMIN") redirect("/dashboard")

  const result = await getManagerAuditLogs()
  const logs = result.success && result.data ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Audit Logs</h1>
        <p className="text-muted-foreground">
          Activity history for your team&apos;s boards and members.
        </p>
      </div>
      <AuditLogManager initialLogs={logs} />
    </div>
  )
}
