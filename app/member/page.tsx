import { getSession } from '@/lib/auth'
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

  const data = await getMemberDashboardData()

  return (
    <MemberDashboardClient 
      user={{ name: session.name, email: session.email }}
      data={data}
    />
  )
}