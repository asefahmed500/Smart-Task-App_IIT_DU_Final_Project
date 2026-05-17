import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { SprintDetail } from '@/components/sprint/sprint-detail'

export default async function MemberSprintDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || !['ADMIN', 'MANAGER', 'MEMBER'].includes(session.role)) {
    redirect('/login')
  }

  const p = await params
  return <SprintDetail sprintId={p.id} basePath="/member" readOnly />
}
