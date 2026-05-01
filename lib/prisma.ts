import { PrismaClient } from '../generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL!

declare global {
  var prisma: PrismaClient | undefined
}

let prisma: PrismaClient

const poolConfig = {
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
}

if (process.env.NODE_ENV === 'production') {
  const pool = new pg.Pool(poolConfig)
  const adapter = new PrismaPg(pool)
  prisma = new PrismaClient({ adapter })
} else {
  if (!global.prisma) {
    const pool = new pg.Pool(poolConfig)
    const adapter = new PrismaPg(pool)
    global.prisma = new PrismaClient({ adapter })
  }
  prisma = global.prisma
}

export default prisma
export * from '../generated/prisma'
