import { config } from 'dotenv'
config({ path: '.env.local' })
// Dynamic import to ensure env is loaded before prisma client
const { prisma } = await import('../lib/prisma')
import bcrypt from 'bcryptjs'

async function main() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.comment.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.taskBlock.deleteMany()
  await prisma.task.deleteMany()
  await prisma.column.deleteMany()
  await prisma.boardMember.deleteMany()
  await prisma.board.deleteMany()
  await prisma.user.deleteMany()
  await prisma.systemSettings.deleteMany()

  // Create System Settings
  await prisma.systemSettings.create({
    data: {
      id: 'global',
      platformName: 'SmartTask Pro',
      allowMemberBoardCreation: true,
      defaultWipLimit: 5,
    }
  })

  // Create users
  const adminPassword = await bcrypt.hash('Password123!', 10)
  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      name: 'System Admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  })

  const managerPassword = await bcrypt.hash('Password123!', 10)
  const manager = await prisma.user.create({
    data: {
      email: 'manager@test.com',
      name: 'Project Manager',
      password: managerPassword,
      role: 'MANAGER',
    },
  })

  const memberPassword = await bcrypt.hash('Password123!', 10)
  const member = await prisma.user.create({
    data: {
      email: 'member@test.com',
      name: 'Team Member',
      password: memberPassword,
      role: 'MEMBER',
    },
  })

  // Create a default board for development
  const board = await prisma.board.create({
    data: {
      name: 'Development Board',
      description: 'The primary workspace for engineering and design.',
      color: '#4f46e5',
      ownerId: admin.id,
      members: {
        create: [
          { userId: admin.id, role: 'ADMIN' },
          { userId: manager.id, role: 'MANAGER' },
          { userId: member.id, role: 'MEMBER' },
        ],
      },
      columns: {
        create: [
          { name: 'Backlog', position: 0 },
          { name: 'To Do', position: 1, wipLimit: 5 },
          { name: 'In Progress', position: 2, wipLimit: 4 },
          { name: 'Code Review', position: 3, wipLimit: 3 },
          { name: 'Done', position: 4, isTerminal: true },
        ],
      },
    },
    include: { columns: true },
  })

  const todoCol = board.columns.find((c) => c.name === 'To Do')!
  const progressCol = board.columns.find((c) => c.name === 'In Progress')!

  // Create initial tasks
  await prisma.task.create({
    data: {
      title: 'Design database schema',
      description: 'Create the primary models for users, boards, tasks, and audit logs.',
      priority: 'HIGH',
      columnId: progressCol.id,
      boardId: board.id,
      createdById: admin.id,
      assigneeId: member.id,
    },
  })

  await prisma.task.create({
    data: {
      title: 'Implement authentication',
      description: 'Setup session-based auth with better-auth.',
      priority: 'CRITICAL',
      columnId: progressCol.id,
      boardId: board.id,
      createdById: admin.id,
      assigneeId: manager.id,
    },
  })

  await prisma.task.create({
    data: {
      title: 'Setup GitHub Actions',
      description: 'Configure CI/CD pipeline for automated testing and deployment.',
      priority: 'MEDIUM',
      columnId: todoCol.id,
      boardId: board.id,
      createdById: admin.id,
    },
  })

  console.log('Seeding completed successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
