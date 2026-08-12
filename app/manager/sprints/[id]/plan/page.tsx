import { getSession } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { SprintPlanningBoard } from '@/components/sprint/sprint-planning-board-dynamic'

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
  const sprint = await prisma.sprint.findUnique({
    where: { id: p.id },
    select: { id: true, boardId: true },
  })
  if (!sprint) notFound()

  return (
    <SprintPlanningBoard
      sprintId={p.id}
      basePath="/manager"
      boardId={sprint.boardId}
      currentUser={{ id: session.id, name: session.name, image: session.image }}
    />
  )
}
