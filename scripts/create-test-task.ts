import { prisma } from '../lib/prisma'

async function main() {
  const boardId = 'cmogr3mhw0003eoyockv4js3a' // Development Board

  // Get Backlog column
  const backlog = await prisma.column.findFirst({
    where: { name: 'Backlog', boardId }
  })

  // Get manager user
  const manager = await prisma.user.findUnique({
    where: { email: 'manager@test.com' }
  })

  if (!backlog || !manager) {
    console.log('Backlog or manager not found')
    return
  }

  // Create task WITHOUT assignee (to test auto-assignment)
  const task = await prisma.task.create({
    data: {
      title: 'Test automation trigger',
      description: 'Move me to In Progress to test auto-assignment',
      priority: 'MEDIUM',
      columnId: backlog.id,
      boardId,
      createdById: manager.id,
      assigneeId: null, // IMPORTANT: No assignee to test auto-assignment
      position: await prisma.task.count({ where: { columnId: backlog.id } }),
      version: 1
    }
  })

  console.log('Created task:', task.id, '-', task.title)
  console.log('Column:', backlog.name, '| Assignee:', task.assigneeId || 'None')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
