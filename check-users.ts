import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import prisma from './lib/prisma'

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true }
  })
  console.log('Users in DB:', JSON.stringify(users, null, 2))
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
