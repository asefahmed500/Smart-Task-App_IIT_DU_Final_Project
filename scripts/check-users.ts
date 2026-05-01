import prisma from '../lib/prisma'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      name: true
    }
  })
  console.table(users)
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
