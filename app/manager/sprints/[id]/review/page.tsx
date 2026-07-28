import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import { SprintReview } from '@/components/sprint/sprint-review'

export default async function ManagerSprintReviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  const p = await params
  return <SprintReview sprintId={p.id} basePath="/manager" />
}
