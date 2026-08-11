import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { SprintList } from '@/components/sprint/sprint-list'

export default async function MemberSprintsPage({
  searchParams,
}: {
  searchParams: Promise<{ boardId?: string }>
}) {
  const session = await getSession()
  if (!session || !['ADMIN', 'MANAGER', 'MEMBER'].includes(session.role)) {
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
      </div>
    )
  }

  // Default to the URL-selected board. Otherwise prefer the board with an
  // ACTIVE sprint, else the newest board the member belongs to.
  const boardId = params.boardId || (await defaultSprintBoard(boards))

  return <SprintList boardId={boardId} boards={boards} basePath="/member" readOnly />
}

async function defaultSprintBoard(boards: { id: string; name: string }[]): Promise<string> {
  const active = await prisma.sprint.findFirst({
    where: { status: 'ACTIVE', boardId: { in: boards.map((b) => b.id) } },
    select: { boardId: true },
  })
  return active?.boardId || boards[0].id
}
