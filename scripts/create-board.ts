import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function main() {
  // Get admin user
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@test.com' },
  })

  if (!admin) {
    console.log('Admin user not found')
    return
  }

  // Create a board
  const board = await prisma.board.create({
    data: {
      name: 'Development Board',
      description: 'Track development tasks',
      color: '#3b82f6',
      ownerId: admin.id,
      columns: {
        create: [
          {
            name: 'Backlog',
            position: 0,
            wipLimit: null,
          },
          {
            name: 'In Progress',
            position: 1,
            wipLimit: 3,
          },
          {
            name: 'Review',
            position: 2,
            wipLimit: 2,
          },
          {
            name: 'Done',
            position: 3,
            wipLimit: null,
          },
        ],
      },
      members: {
        create: [
          {
            userId: admin.id,
            role: 'ADMIN',
          },
          {
            userId: (await prisma.user.findUnique({ where: { email: 'manager@test.com' } }))!.id,
            role: 'MANAGER',
          },
          {
            userId: (await prisma.user.findUnique({ where: { email: 'member@test.com' } }))!.id,
            role: 'MEMBER',
          },
        ],
      },
    },
  })

  console.log('Created board:', board.name)

  // Create some tasks
  const columns = await prisma.column.findMany({
    where: { boardId: board.id },
    orderBy: { position: 'asc' },
  })

  const tasks = [
    { title: 'Setup project', description: 'Initialize the project structure', columnId: columns[0].id, priority: 'HIGH' },
    { title: 'Design database schema', description: 'Create Prisma schema', columnId: columns[0].id, priority: 'MEDIUM' },
    { title: 'Implement auth', description: 'Add JWT authentication', columnId: columns[1].id, priority: 'HIGH', assigneeId: admin.id },
    { title: 'Create UI components', description: 'Build reusable UI components', columnId: columns[1].id, priority: 'MEDIUM', assigneeId: (await prisma.user.findUnique({ where: { email: 'member@test.com' } }))!.id },
    { title: 'Write tests', description: 'Add unit and integration tests', columnId: columns[2].id, priority: 'LOW' },
  ]

  for (const task of tasks) {
    await prisma.task.create({
      data: {
        title: task.title,
        description: task.description,
        columnId: task.columnId,
        boardId: board.id,
        createdById: admin.id,
        priority: task.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
        assigneeId: task.assigneeId,
      },
    })
    console.log('Created task:', task.title)
  }

  console.log('Done!')
  await prisma.$disconnect()
}

main().catch(console.error)
