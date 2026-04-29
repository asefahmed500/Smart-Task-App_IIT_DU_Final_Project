import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seed started...')

  const roles = [
    { name: 'Admin User', email: 'admin@smarttask.com', role: 'ADMIN' },
    { name: 'Manager User', email: 'manager@smarttask.com', role: 'MANAGER' },
    { name: 'Member User', email: 'member@smarttask.com', role: 'MEMBER' },
  ]

  const password = await bcrypt.hash('Password123!', 10)

  for (const r of roles) {
    const user = await prisma.user.upsert({
      where: { email: r.email },
      update: {
        role: r.role as any,
        emailVerified: true,
      },
      create: {
        email: r.email,
        name: r.name,
        password,
        role: r.role as any,
        emailVerified: true,
      },
    })
    console.log(`Created/Updated user: ${user.email} (${user.role})`)
  }

  console.log('Seed finished.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
