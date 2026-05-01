import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import prisma from '../lib/prisma'

async function main() {
  const boards = await prisma.board.findMany({
    include: {
      owner: {
        select: { email: true }
      },
      members: {
        select: { email: true }
      }
    }
  })
  
  console.log('--- Current Boards ---')
  boards.forEach(b => {
    console.log(`Board: ${b.name} (ID: ${b.id})`)
    console.log(` Owner: ${b.owner.email}`)
    console.log(` Members: ${b.members.map(m => m.email).join(', ') || 'None'}`)
    console.log('--------------------')
  })
}

main()
  .finally(async () => {
    await prisma.$disconnect()
  })
