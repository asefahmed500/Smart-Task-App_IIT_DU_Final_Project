import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { getAuditLogs } from '@/lib/admin-actions'
import { AuditLogManager } from '@/components/admin/audit-log-manager'

export default async function AuditLogsPage() {
  const session = await getSession()

  if (!session || session.role !== 'ADMIN') {
    redirect('/login')
  }

  const logsResult = await getAuditLogs()
  const logs = logsResult.success ? (logsResult.data as any[]) : []

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <AuditLogManager initialLogs={logs} />
    </div>
  )
}
