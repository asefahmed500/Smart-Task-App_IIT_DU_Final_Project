import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'
import * as bcrypt from 'bcrypt'
const { Pool } = pkg

// Load environment variables
config({ path: '.env.local' })

// Set up Prisma client with adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting seed...')

  const users = [
    {
      email: 'admin@test.com',
      password: 'password123',
      name: 'Admin User',
      role: 'ADMIN' as const,
    },
    {
      email: 'manager@test.com',
      password: 'password123',
      name: 'Manager User',
      role: 'MANAGER' as const,
    },
    {
      email: 'member@test.com',
      password: 'password123',
      name: 'Member User',
      role: 'MEMBER' as const,
    },
  ]

  // First, delete existing test users
  await prisma.user.deleteMany({
    where: {
      email: {
        in: users.map(u => u.email),
      },
    },
  })
  console.log('Deleted existing test users...')

  for (const userData of users) {
    try {
      // Hash password using bcrypt (same as better-auth uses)
      const hashedPassword = await bcrypt.hash(userData.password, 10)

      // Create user directly in database
      await prisma.user.create({
        data: {
          email: userData.email,
          password: hashedPassword,
          name: userData.name,
          role: userData.role,
          avatar: null,
        },
      })

      console.log(`Created user: ${userData.email} with role: ${userData.role}`)
    } catch (error) {
      console.error(`Failed to create user ${userData.email}:`, error)
    }
  }

  console.log('Seed completed!')
  console.log('You can now login with:')
  console.log('  admin@test.com / password123 (Admin)')
  console.log('  manager@test.com / password123 (Manager)')
  console.log('  member@test.com / password123 (Member)')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
