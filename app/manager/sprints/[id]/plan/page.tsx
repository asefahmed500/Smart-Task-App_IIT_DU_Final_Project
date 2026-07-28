import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { SprintPlanningBoard } from '@/components/sprint/sprint-planning-board'

export default async function ManagerSprintPlanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  const p = await params
  return <SprintPlanningBoard sprintId={p.id} basePath="/manager" />
}
