import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding role-based test users...')

  const password = await bcrypt.hash('Password123!', 10)

  const users = [
    {
      email: 'admin@test.com',
      name: 'Admin User',
      role: 'ADMIN',
      password,
    },
    {
      email: 'manager@test.com',
      name: 'Manager User',
      role: 'MANAGER',
      password,
    },
    {
      email: 'member@test.com',
      name: 'Member User',
      role: 'MEMBER',
      password,
    },
  ]

  for (const user of users) {
    const existing = await prisma.user.findUnique({
      where: { email: user.email },
    })

    if (!existing) {
      await prisma.user.create({
        data: user as any,
      })
      console.log(`✅ Created ${user.role} user: ${user.email}`)
    } else {
      await prisma.user.update({
        where: { email: user.email },
        data: { role: user.role as any, password },
      })
      console.log(`ℹ️ Updated ${user.role} user: ${user.email}`)
    }
  }

  console.log('✅ Seeding complete.')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
