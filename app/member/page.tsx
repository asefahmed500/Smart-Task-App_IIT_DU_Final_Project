import { getSession } from '@/lib/auth-server'
import { getMemberDashboardData } from '@/lib/dashboard-actions'
import { redirect } from 'next/navigation'
import { MemberDashboardClient } from '@/components/dashboard/member-dashboard-client'

export default async function MemberPage() {
  const session = await getSession()
  
  if (!session) {
    redirect('/login')
  }

  if (session.role === 'ADMIN' || session.role === 'MANAGER') {
    redirect('/manager')
  }

  const result = await getMemberDashboardData()
  const data = result.success ? (result.data as any) : {
    assignedTasks: 0,
    completedTasks: 0,
    activeBoardCount: 0,
    unreadNotifications: 0,
    myTasks: [],
    focusTasks: [],
    recentActivity: []
  }

  return (
    <MemberDashboardClient 
      user={{ name: session.name, email: session.email }}
      data={data}
    />
  )
}