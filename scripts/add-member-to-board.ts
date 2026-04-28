import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const boardId = 'cmohhcr4g0001g0yofeazncvj' // Test Board for Comprehensive Testing
  const memberUserId = 'cmogr3ltr0002eoyozf6pjtqf' // Team Member

  // Check if already a member
  const existing = await prisma.boardMember.findUnique({
    where: {
      boardId_userId: {
        boardId,
        userId: memberUserId
      }
    }
  })

  if (existing) {
    console.log('User is already a member of this board')
    return
  }

  // Add member
  const member = await prisma.boardMember.create({
    data: {
      boardId,
      userId: memberUserId,
      role: 'MEMBER'
    },
    include: {
      user: {
        select: { id: true, name: true, email: true }
      }
    }
  })

  console.log('Added member to board:', member)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
