import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { EpicList } from '@/components/sprint/epic-list'

export default async function ManagerEpicsPage({
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
        <p className="text-muted-foreground text-sm mt-2">Create a board first to use epics.</p>
      </div>
    )
  }

  const boardId = params.boardId || boards[0].id

  return <EpicList boardId={boardId} boards={boards} basePath="/manager" />
}
