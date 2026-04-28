import { prisma } from '../lib/prisma'

async function main() {
  const task = await prisma.task.findUnique({
    where: { id: 'cmoi1mo3e0000lsyozdztkmlm' },
    include: {
      assignee: { select: { id: true, name: true, email: true } },
      column: { select: { id: true, name: true } }
    }
  })

  if (!task) {
    console.log('Task not found')
    return
  }

  console.log('Task:', task.title)
  console.log('Column:', task.column.name)
  console.log('Assignee:', task.assignee ? `${task.assignee.name} (${task.assignee.email})` : 'None')
  console.log('Assignee ID:', task.assigneeId || 'None')
  console.log('Version:', task.version)
  console.log('Last Moved:', task.lastMovedAt)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
