import { getSession } from '@/lib/auth-server'
import { getManagerDashboardData } from '@/actions/dashboard-actions'
import { redirect } from 'next/navigation'
import { ManagerDashboardClient } from '@/components/dashboard/manager-dashboard-client'

export default async function ManagerPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  if (session.role !== 'ADMIN' && session.role !== 'MANAGER') {
    redirect('/dashboard')
  }

  const result = await getManagerDashboardData()
  const data = result.success ? (result.data as any) : {
    boards: [],
    totalTasks: 0,
    completedThisWeek: 0,
    teamMemberCount: 0,
    unassignedTasks: 0,
    bottleneckColumns: []
  }

  return (
    <ManagerDashboardClient 
      user={{ name: session.name, email: session.email }}
      data={data}
    />
  )
}