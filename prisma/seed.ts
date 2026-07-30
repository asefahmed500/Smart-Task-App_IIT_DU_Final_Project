import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

if (process.env.NODE_ENV === 'production') {
  dotenv.config()
} else {
  dotenv.config({ path: '.env.local' })
}

const connectionString = process.env.DATABASE_URL!
const isSupabase = connectionString.includes('supabase.com')
const pool = new pg.Pool({
  connectionString,
  ...(isSupabase ? { ssl: { rejectUnauthorized: false } as any } : {}),
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function upsertUser(email: string, password: string, name: string, role: 'ADMIN' | 'MANAGER' | 'MEMBER') {
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`  User ${email} already exists, skipping.`)
    return existing
  }
  const hash = await bcrypt.hash(password, 10)
  return prisma.user.create({
    data: { email, password: hash, name, role },
  })
}

async function main() {
  console.log('Starting seed (idempotent)...')

  const users = await Promise.all([
    upsertUser('admin@smarttask.com', 'AdminPassword123!', 'System Admin', 'ADMIN'),
    upsertUser('manager@smarttask.com', 'AdminPassword123!', 'Project Manager', 'MANAGER'),
    upsertUser('member@smarttask.com', 'AdminPassword123!', 'Team Member', 'MEMBER'),
    upsertUser('admin@gmail.com', 'admin123', 'Admin', 'ADMIN'),
    upsertUser('manager@gmail.com', 'manager123', 'Manager', 'MANAGER'),
  ])
  const admin = users[0]
  const manager = users[1]
  const member = users[2]

  console.log('Users created/verified.')

  // Create boards if they don't exist
  const existingBoards = await prisma.board.count()
  if (existingBoards > 0) {
    console.log(`  ${existingBoards} board(s) already exist, skipping board creation.`)
  } else {
    const projectA = await prisma.board.create({
      data: {
        name: 'Product Launch 2026',
        description: 'Major product rollout campaign',
        ownerId: admin.id,
        members: { connect: [{ id: manager.id }, { id: member.id }] },
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
      include: { columns: true },
    })

    await prisma.board.create({
      data: {
        name: 'Internal Operations',
        description: 'Internal team management',
        ownerId: manager.id,
        members: { connect: [{ id: member.id }] },
        columns: {
          create: [
            { name: 'Planned', order: 0 },
            { name: 'Active', order: 1 },
            { name: 'Completed', order: 2 },
          ],
        },
      },
    })

    const backlogCol = projectA.columns.find(c => c.name === 'Backlog')
    const todoCol = projectA.columns.find(c => c.name === 'To Do')
    const inProgressCol = projectA.columns.find(c => c.name === 'In Progress')

    if (backlogCol && todoCol && inProgressCol) {
      await prisma.task.create({
        data: {
          title: 'Design Marketing Assets',
          description: 'Create social media banners and email templates',
          priority: 'HIGH', columnId: backlogCol.id,
          creatorId: admin.id, assigneeId: member.id,
        },
      })
      await prisma.task.create({
        data: {
          title: 'Setup Production Environment',
          description: 'Configure AWS clusters and CI/CD pipelines',
          priority: 'HIGH', columnId: todoCol.id,
          creatorId: admin.id,
        },
      })
      await prisma.task.create({
        data: {
          title: 'Implement Core API',
          description: 'Develop the main backend services',
          priority: 'MEDIUM', columnId: inProgressCol.id,
          creatorId: manager.id, assigneeId: member.id,
        },
      })
    }
    console.log('Boards and tasks created.')
  }

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
