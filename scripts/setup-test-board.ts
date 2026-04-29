// Load env vars FIRST before any other imports
import { config } from 'dotenv'
import path from 'path'

// Load .env.local
const result = config({ path: path.resolve(process.cwd(), '.env.local') })
if (result.error) {
  console.warn('Warning: .env.local not found, using environment variables')
}

// Direct Prisma import to avoid env-validation issues
import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcryptjs'

// Create Prisma client directly
const DATABASE_URL = process.env.DATABASE_URL!
const adapter = new PrismaNeon({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Setting up test board...\n')

  // Find or create admin
  let admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!admin) {
    console.log('Creating admin user...')
    const hashedPassword = await bcrypt.hash('Admin123!', 10)
    admin = await prisma.user.create({
      data: {
        email: 'admin@smarttask.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
      }
    })
    console.log('Created admin:', admin.email)
  } else {
    console.log('Found admin:', admin.email)
  }

  // Find the member
  const member = await prisma.user.findUnique({
    where: { email: 'asefahmed500@gmail.com' }
  })

  if (!member) {
    console.log('\n❌ Member asefahmed500@gmail.com not found!')
    console.log('Please register this account first.')
    await prisma.$disconnect()
    return
  }

  console.log('\nFound member:', member.email, '(Role:', member.role + ')')

  // Create a test board
  console.log('\nCreating test board...')
  const board = await prisma.board.create({
    data: {
      name: 'Test Project Board',
      description: 'A board for testing member features',
      ownerId: admin.id,
      columns: {
        create: [
          { name: 'Backlog', position: 0 },
          { name: 'In Progress', position: 1, wipLimit: 3 },
          { name: 'Review', position: 2 },
          { name: 'Done', position: 3, isTerminal: true }
        ]
      }
    },
    include: {
      columns: true
    }
  })

  console.log('Created board:', board.name, '(ID:', board.id + ')')
  console.log('Columns:', board.columns.map(c => c.name).join(', '))

  // Add member to the board with MEMBER role
  console.log('\nAdding member to board...')
  await prisma.boardMember.create({
    data: {
      boardId: board.id,
      userId: member.id,
      role: 'MEMBER'
    }
  })

  console.log('✅ Added', member.email, 'as MEMBER on board', board.name)

  // Create some test tasks
  console.log('\nCreating test tasks...')
  const backlogColumn = board.columns.find(c => c.name === 'Backlog')
  const inProgressColumn = board.columns.find(c => c.name === 'In Progress')

  if (!backlogColumn || !inProgressColumn) {
    throw new Error('Columns not found')
  }

  await prisma.task.create({
    data: {
      title: 'Test login functionality',
      description: 'Verify that members can login and see the dashboard',
      boardId: board.id,
      columnId: backlogColumn.id,
      createdById: admin.id,
      priority: 'HIGH',
      labels: ['testing', 'auth']
    }
  })

  await prisma.task.create({
    data: {
      title: 'Update user profile',
      description: 'Members should be able to update their profile information',
      boardId: board.id,
      columnId: inProgressColumn.id,
      createdById: admin.id,
      assigneeId: member.id,
      priority: 'MEDIUM',
      labels: ['feature']
    }
  })

  await prisma.task.create({
    data: {
      title: 'Test task assignment',
      description: 'Verify members can assign tasks to themselves',
      boardId: board.id,
      columnId: backlogColumn.id,
      createdById: admin.id,
      priority: 'LOW',
      labels: ['testing']
    }
  })

  console.log('Created 3 test tasks')

  console.log('\n✅ Setup complete!')
  console.log('\nLogin as asefahmed500@gmail.com to test member features.')
  console.log('Board ID:', board.id)

  await prisma.$disconnect()
}

main().catch(console.error)
