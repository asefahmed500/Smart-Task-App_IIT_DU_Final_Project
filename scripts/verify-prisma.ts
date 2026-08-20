import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: '.env.local' })

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error('DATABASE_URL is not set (.env)')

  const pool = new pg.Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: 15000,
  })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  const [users, boards, tasks] = await Promise.all([
    prisma.user.count(),
    prisma.board.count(),
    prisma.task.count(),
  ])
  console.log(
    `✅ Connected — Prisma Postgres reachable via PrismaClient (users: ${users}, boards: ${boards}, tasks: ${tasks})`
  )
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('❌ Verification failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
