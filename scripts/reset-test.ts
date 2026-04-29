import { prisma } from '../lib/prisma.js'

async function main() {
  await prisma.user.deleteMany({})
  console.log('All users deleted')
}

main().catch(console.error)
