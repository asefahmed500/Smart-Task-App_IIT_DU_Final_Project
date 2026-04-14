import { config } from 'dotenv'
config({ path: '.env.local' })

import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'
import bcrypt from 'bcrypt'

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
})
const prisma = new PrismaClient({ adapter })

async function resetUsers() {
  // Delete all existing users
  await prisma.user.deleteMany({})
  console.log('Deleted all users')

  // Create test users
  const users = [
    { email: 'admin@test.com', password: 'password123', name: 'Admin User', role: 'ADMIN' as const },
    { email: 'manager@test.com', password: 'password123', name: 'Manager User', role: 'MANAGER' as const },
    { email: 'member@test.com', password: 'password123', name: 'Member User', role: 'MEMBER' as const },
  ]

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10)
    await prisma.user.create({
      data: {
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        role: userData.role,
      },
    })
    console.log(`Created user: ${userData.email} with role: ${userData.role}`)
  }

  console.log('Done!')
  await prisma.$disconnect()
}

resetUsers().catch(console.error)
