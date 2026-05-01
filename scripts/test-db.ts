import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const count = await prisma.user.count()
  const users = await prisma.user.findMany({
    select: { email: true, role: true }
  })
  console.log('--- DATABASE CHECK ---')
  console.log(`Total Users: ${count}`)
  console.log('Users:', JSON.stringify(users, null, 2))
  console.log('----------------------')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
