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
  })

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground text-lg">No boards found.</p>
        <p className="text-muted-foreground text-sm mt-2">Create a board first to use sprint planning.</p>
      </div>
    )
  }

  // Default to the first board that has sprints so the list is never empty
  // on first load; fall back to the first board otherwise.
  const sprintsByBoard = await prisma.sprint.findMany({
    where: { boardId: { in: boards.map((b) => b.id) } },
    select: { boardId: true },
    distinct: ['boardId'],
  })
  const boardWithSprints = boards.find((b) => sprintsByBoard.some((s) => s.boardId === b.id))
  const defaultBoardId = boardWithSprints?.id || boards[0].id
  const boardId = params.boardId || defaultBoardId

  return <SprintList boardId={boardId} boards={boards} basePath="/manager" />
}
