import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const connectionString = process.env.DATABASE_URL!
const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting seed...')

  // Cleanup
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.checklistItem.deleteMany()
  await prisma.checklist.deleteMany()
  await prisma.timeEntry.deleteMany()
  await prisma.review.deleteMany()
  await prisma.task.deleteMany()
  await prisma.column.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.board.deleteMany()
  await prisma.user.deleteMany()

  const hashedPassword = await bcrypt.hash('AdminPassword123!', 10)

  // Create Users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@smarttask.com',
      password: hashedPassword,
      name: 'System Admin',
      role: 'ADMIN',
    },
  })

  const manager = await prisma.user.create({
    data: {
      email: 'manager@smarttask.com',
      password: hashedPassword,
      name: 'Project Manager',
      role: 'MANAGER',
    },
  })

  const member = await prisma.user.create({
    data: {
      email: 'member@smarttask.com',
      password: hashedPassword,
      name: 'Team Member',
      role: 'MEMBER',
    },
  })

  console.log('Users created.')

  // Create Boards
  const projectA = await prisma.board.create({
    data: {
      name: 'Product Launch 2026',
      description: 'Major product rollout campaign',
      ownerId: admin.id,
      members: {
        connect: [{ id: manager.id }, { id: member.id }],
      },
      columns: {
        create: [
          { name: 'Backlog', order: 0 },
          { name: 'To Do', order: 1 },
          { name: 'In Progress', order: 2 },
          { name: 'Review', order: 3 },
          { name: 'Done', order: 4 },
        ],
      },
    },
    include: {
      columns: true,
    },
  })

  await prisma.board.create({
    data: {
      name: 'Internal Operations',
      description: 'Internal team management',
      ownerId: manager.id,
      members: {
        connect: [{ id: member.id }],
      },
      columns: {
        create: [
          { name: 'Planned', order: 0 },
          { name: 'Active', order: 1 },
          { name: 'Completed', order: 2 },
        ],
      },
    },
    include: {
      columns: true,
    },
  })

  console.log('Boards and Columns created.')

  // Create Tasks for Product Launch
  const backlogCol = projectA.columns.find(c => c.name === 'Backlog')
  const todoCol = projectA.columns.find(c => c.name === 'To Do')
  const inProgressCol = projectA.columns.find(c => c.name === 'In Progress')

  if (backlogCol && todoCol && inProgressCol) {
    await prisma.task.create({
      data: {
        title: 'Design Marketing Assets',
        description: 'Create social media banners and email templates',
        priority: 'HIGH',
        columnId: backlogCol.id,
        creatorId: admin.id,
        assigneeId: member.id,
      },
    })

    await prisma.task.create({
      data: {
        title: 'Setup Production Environment',
        description: 'Configure AWS clusters and CI/CD pipelines',
        priority: 'HIGH',
        columnId: todoCol.id,
        creatorId: admin.id,
      },
    })

    await prisma.task.create({
      data: {
        title: 'Implement Core API',
        description: 'Develop the main backend services',
        priority: 'MEDIUM',
        columnId: inProgressCol.id,
        creatorId: manager.id,
        assigneeId: member.id,
      },
    })
  }

  console.log('Tasks created.')
  console.log('Seed completed successfully.')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
