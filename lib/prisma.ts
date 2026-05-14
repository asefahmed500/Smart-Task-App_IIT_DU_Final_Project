import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import dotenv from 'dotenv'

if (!process.env.DATABASE_URL) {
  dotenv.config({ path: '.env.local' })
}

declare global {
  var prisma: PrismaClient | undefined
}

const isSupabase = (process.env.DATABASE_URL || '').includes('supabase.com')

let _prisma: PrismaClient | undefined

function getPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL!
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  const poolConfig: pg.PoolConfig = {
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ...(isSupabase ? { ssl: { rejectUnauthorized: false } as any } : {}),
  }

  const pool = new pg.Pool(poolConfig)
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

if (process.env.NODE_ENV === 'production') {
  _prisma = getPrismaClient()
} else {
  if (!global.prisma) {
    global.prisma = getPrismaClient()
  }
  _prisma = global.prisma
}

const prisma = _prisma!

export default prisma
export * from '../generated/prisma'
