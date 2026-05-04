import { getSession } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { getMemberAuditLogs } from "@/actions/admin-actions"
import { AuditLogManager } from "@/components/admin/audit-log-manager"

export default async function MemberLogsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "MEMBER" && session.role !== "MANAGER" && session.role !== "ADMIN") redirect("/dashboard")

  const result = await getMemberAuditLogs()
  const logs = result.success && result.data ? result.data : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Activity Log</h1>
        <p className="text-muted-foreground">
          History of your actions across all boards.
        </p>
      </div>
      <AuditLogManager initialLogs={logs} />
    </div>
  )
}
