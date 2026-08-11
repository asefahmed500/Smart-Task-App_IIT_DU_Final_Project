import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { SprintList } from '@/components/sprint/sprint-list'

export default async function ManagerSprintsPage({
  searchParams,
}: {
  searchParams: Promise<{ boardId?: string }>
}) {
  const session = await getSession()
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  const params = await searchParams
  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerId: session.id },
        { members: { some: { id: session.id } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' }, // newest board first
  })

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground text-lg">No boards found.</p>
        <p className="text-muted-foreground text-sm mt-2">Create a board first to use sprint planning.</p>
      </div>
    )
  }

  // Default to the URL-selected board, otherwise the NEWEST board (the one the
  // manager is most likely working on). Do NOT auto-jump to a board with
  // sprints — that made new sprints always land on the first sprinted board.
  const boardId = params.boardId || boards[0].id

  return <SprintList boardId={boardId} boards={boards} basePath="/manager" />
}
