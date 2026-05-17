import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { BacklogView } from '@/components/sprint/backlog-view'

export default async function MemberBacklogPage({
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
  })

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground text-lg">No boards found.</p>
      </div>
    )
  }

  const boardId = params.boardId || boards[0].id

  return <BacklogView boardId={boardId} boards={boards} basePath="/member" readOnly />
}
