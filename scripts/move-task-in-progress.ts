import { prisma } from '../lib/prisma'

async function main() {
  const boardId = 'cmogr3mhw0003eoyockv4js3a' // Development Board
  const taskId = 'cmoi1mo3e0000lsyozdztkmlm' // Test automation trigger

  // Get In Progress column
  const inProgress = await prisma.column.findFirst({
    where: { name: 'In Progress', boardId }
  })

  if (!inProgress) {
    console.log('In Progress column not found')
    return
  }

  // Get current task state
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { column: true }
  })

  if (!task) {
    console.log('Task not found')
    return
  }

  console.log('Current state:', task.column.name, '| Assignee:', task.assigneeId || 'None')

  // Move task to In Progress (this should trigger automation)
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      columnId: inProgress.id,
      position: await prisma.task.count({ where: { columnId: inProgress.id } }),
      lastMovedAt: new Date(),
      version: { increment: 1 }
    },
    include: { column: true }
  })

  console.log('After move:', updated.column.name, '| Assignee:', updated.assigneeId || 'None')
  console.log('Automation should have assigned to Team Member!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
