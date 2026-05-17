import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { SprintDetail } from '@/components/sprint/sprint-detail'

export default async function ManagerSprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  const p = await params
  return <SprintDetail sprintId={p.id} basePath="/manager" />
}
