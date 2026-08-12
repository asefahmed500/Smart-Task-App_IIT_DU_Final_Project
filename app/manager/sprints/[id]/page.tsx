import { getSession } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
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
  const sprint = await prisma.sprint.findUnique({
    where: { id: p.id },
    select: { id: true, boardId: true },
  })
  if (!sprint) notFound()

  return (
    <SprintDetail
      sprintId={p.id}
      basePath="/manager"
      boardId={sprint.boardId}
      currentUser={{ id: session.id, name: session.name, image: session.image }}
    />
  )
}
