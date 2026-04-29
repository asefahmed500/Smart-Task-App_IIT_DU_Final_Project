import { prisma } from '@/lib/prisma'
import { SessionUser } from '@/lib/session'

export async function verifyBoardAccess(
  userId: string,
  boardId: string,
  userRole?: string
) {
  // If user is a platform ADMIN, they have access to all boards
  if (userRole === 'ADMIN') {
    return prisma.board.findUnique({
      where: { id: boardId },
    })
  }

  return prisma.board.findFirst({
    where: {
      id: boardId,
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
  })
}

export async function verifyBoardAccessOrFail(
  userId: string,
  boardId: string
) {
  const board = await verifyBoardAccess(userId, boardId)
  if (!board) {
    throw new Error('Board not found or access denied')
  }
  return board
}