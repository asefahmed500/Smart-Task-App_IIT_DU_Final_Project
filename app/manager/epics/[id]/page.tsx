import { getSession } from '@/lib/auth-server'
import { redirect, notFound } from 'next/navigation'
import prisma from '@/lib/prisma'
import { EpicDetail } from '@/components/sprint/epic-detail'

export default async function EpicDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ boardId?: string }>
}) {
  const session = await getSession()
  if (!session || (session.role !== 'MANAGER' && session.role !== 'ADMIN')) {
    redirect('/login')
  }

  const { id } = await params
  const { boardId: searchBoardId } = await searchParams

  const epic = await prisma.epic.findUnique({
    where: { id },
    select: { id: true, boardId: true },
  })
  if (!epic) notFound()

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <EpicDetail
        epicId={id}
        basePath="/manager"
        boardId={searchBoardId || epic.boardId}
        currentUser={{ id: session.id, name: session.name, image: session.image }}
      />
    </div>
  )
}
