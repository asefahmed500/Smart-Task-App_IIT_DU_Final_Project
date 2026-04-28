// Load env vars FIRST before any other imports
import { config } from 'dotenv'
import path from 'path'

const result = config({ path: path.resolve(process.cwd(), '.env.local') })
if (result.error) {
  console.warn('Warning: .env.local not found, using environment variables')
}

import { prisma } from '../lib/prisma'

async function main() {
  const member = await prisma.user.findUnique({
    where: { email: 'asefahmed500@gmail.com' },
    include: {
      memberships: {
        include: {
          board: {
            include: {
              columns: true,
              tasks: true,
              _count: { select: { members: true, tasks: true } }
            }
          }
        }
      }
    }
  })

  if (member) {
    console.log('Member:', member.email)
    console.log('Memberships:', member.memberships.length)
    member.memberships.forEach(m => {
      console.log(`  Board: ${m.board.name} (Role: ${m.role}, ID: ${m.board.id})`)
      console.log(`    Columns: ${m.board.columns.length}`)
      console.log(`    Tasks: ${m.board.tasks.length}`)
      console.log(`    Members: ${m.board._count.members}`)
    })
  } else {
    console.log('Member not found')
  }
}

main().catch(console.error)
