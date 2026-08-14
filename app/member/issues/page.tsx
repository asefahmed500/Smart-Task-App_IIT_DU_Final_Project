import { getSession } from '@/lib/auth-server'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { IssueTracker } from '@/components/sprint/issue-tracker'

export default async function MemberIssuesPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  const boards = await prisma.board.findMany({
    where: {
      OR: [
        { ownerId: session.id },
        { members: { some: { id: session.id } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (boards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-muted-foreground text-lg">No boards found.</p>
        <p className="text-muted-foreground text-sm mt-2">You need to be added to a board to track issues.</p>
      </div>
    )
  }

  return <IssueTracker boards={boards} currentUser={{ id: session.id, name: session.name, image: session.image }} />
}
