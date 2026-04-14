import { prisma } from '@/lib/prisma'
import { SessionUser } from '@/lib/session'

export type EffectiveRole = 'ADMIN' | 'MANAGER' | 'MEMBER' | null

/**
 * Calculates a user's effective role on a specific board.
 * - Platform ADMINs are always 'ADMIN'.
 * - Board owners are always 'ADMIN'.
 * - Otherwise, it falls back to the user's `BoardMember` role inside the board.
 * - Returns `null` if the user has no access (not invited, not owner, not platform ADMIN).
 */
export async function getEffectiveBoardRole(
  session: SessionUser,
  boardId: string
): Promise<EffectiveRole> {
  const userId = session.user.id
  const platformRole = session.user.role

  // Platform ADMINs have global ADMIN privileges
  if (platformRole === 'ADMIN') {
    return 'ADMIN'
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      members: {
        where: { userId },
      },
    },
  })

  // Board doesn't exist
  if (!board) {
    return null
  }

  // Board Owners are implicit ADMINs of their board
  if (board.ownerId === userId) {
    return 'ADMIN'
  }

  // If invited to the board, return their assigned BoardMember role
  if (board.members.length > 0) {
    return board.members[0].role as EffectiveRole
  }

  // User is not an admin, not owner, and not explicitly invited
  return null
}
