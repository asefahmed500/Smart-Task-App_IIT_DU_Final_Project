import { getSession } from '@/lib/auth'
import { getManagerDashboardData } from '@/lib/dashboard-actions'
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

  const data = await getManagerDashboardData()

  return (
    <ManagerDashboardClient 
      user={{ name: session.name, email: session.email }}
      data={data}
    />
  )
}