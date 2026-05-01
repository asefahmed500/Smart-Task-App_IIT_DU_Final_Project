import prisma from '../lib/prisma'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const email = 'admin@smarttask.com'
  const password = 'AdminPassword123!'
  const name = 'System Admin'

  const hashedPassword = await bcrypt.hash(password, 10)

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
    },
    create: {
      email,
      password: hashedPassword,
      name,
      role: 'ADMIN',
    },
  })

  console.log('Admin user created/updated:', admin.email)
  console.log('Password:', password)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
