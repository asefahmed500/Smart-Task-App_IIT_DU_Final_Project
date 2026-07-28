import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { SprintRetro } from '@/components/sprint/sprint-retro'

export default async function ManagerSprintRetroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  const p = await params
  return <SprintRetro sprintId={p.id} basePath="/manager" />
}
