import { prisma } from '../lib/prisma'

async function main() {
  const boardId = 'cmogr3mhw0003eoyockv4js3a' // Development Board

  // Get columns
  const backlog = await prisma.column.findFirst({
    where: { name: 'Backlog', boardId }
  })

  const done = await prisma.column.findFirst({
    where: { name: 'Done', boardId }
  })

  const manager = await prisma.user.findUnique({
    where: { email: 'manager@test.com' }
  })

  if (!backlog || !done || !manager) {
    console.log('Required data not found')
    return
  }

  console.log('Creating test tasks for dependencies...')

  // Create Task A (blocker)
  const taskA = await prisma.task.create({
    data: {
      title: 'Task A - Must complete first',
      description: 'This task blocks Task B',
      priority: 'HIGH',
      columnId: backlog.id,
      boardId,
      createdById: manager.id,
      position: await prisma.task.count({ where: { columnId: backlog.id } }),
      version: 1
    }
  })

  console.log('Created Task A:', taskA.id)

  // Create Task B (will be blocked)
  const taskB = await prisma.task.create({
    data: {
      title: 'Task B - Blocked by Task A',
      description: 'Cannot complete until Task A is done',
      priority: 'MEDIUM',
      columnId: backlog.id,
      boardId,
      createdById: manager.id,
      position: await prisma.task.count({ where: { columnId: backlog.id } }),
      version: 1
    }
  })

  console.log('Created Task B:', taskB.id)

  // Add BLOCKS dependency: Task A BLOCKS Task B
  console.log('\nAdding dependency: Task A BLOCKS Task B')
  const dep = await prisma.taskBlock.create({
    data: {
      blockerId: taskA.id,
      blockingId: taskB.id,
      createdById: manager.id
    }
  })

  // Mark Task B as blocked
  await prisma.task.update({
    where: { id: taskB.id },
    data: { isBlocked: true }
  })

  console.log('Dependency created:', dep.id)

  // Verify state
  const taskBCheck = await prisma.task.findUnique({
    where: { id: taskB.id },
    select: { id: true, title: true, isBlocked: true }
  })

  console.log('\nTask B state:')
  console.log('- Title:', taskBCheck?.title)
  console.log('- Is Blocked:', taskBCheck?.isBlocked)

  // Get blockers for Task B
  const blockers = await prisma.taskBlock.findMany({
    where: { blockingId: taskB.id },
    include: {
      blocker: { select: { id: true, title: true } }
    }
  })

  console.log('- Blockers:', blockers.map(b => b.blocker.title))

  console.log('\n\n✅ Dependencies test setup complete!')
  console.log('Task IDs for API testing:')
  console.log('- Task A (blocker):', taskA.id)
  console.log('- Task B (blocked):', taskB.id)
  console.log('\nNow try moving Task B to Done via API - should fail with blocked error')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
