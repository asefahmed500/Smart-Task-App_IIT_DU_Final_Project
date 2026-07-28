import { getSession } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { SprintKanbanBoard } from '@/components/sprint/sprint-kanban-board'

export default async function ManagerSprintBoardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  const p = await params

  // Fetch sprint with board to get boardId
  const sprint = await prisma.sprint.findUnique({
    where: { id: p.id },
    select: { id: true, boardId: true },
  })
  if (!sprint) notFound()

  // Fetch board data with columns, members, epics
  const board = await prisma.board.findUnique({
    where: { id: sprint.boardId },
    include: {
      columns: { orderBy: { order: 'asc' } },
      members: { select: { id: true, name: true, email: true, image: true } },
      epics: { select: { id: true, name: true, color: true, status: true, _count: { select: { tasks: true } } } },
    },
  })
  if (!board) notFound()

  return (
    <SprintKanbanBoard
      sprintId={p.id}
      boardId={board.id}
      columns={board.columns.map((c) => ({ id: c.id, name: c.name, order: c.order, wipLimit: c.wipLimit }))}
      boardMembers={board.members.map((m) => ({ id: m.id, name: m.name, email: m.email, image: m.image }))}
      boardEpics={board.epics.map((e) => ({ id: e.id, name: e.name, color: e.color, status: e.status, _count: e._count }))}
      currentUser={{ id: session.id, name: session.name, email: session.email, image: session.image, role: session.role as any }}
      basePath="/manager"
    />
  )
}
