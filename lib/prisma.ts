import { PrismaClient } from '@prisma/client'
import { Pool, neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { getEnv } from './env-validation'
import ws from 'ws'

// Set up WebSocket for Neon in Node.js environments if needed
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

const env = getEnv()

if (process.env.NODE_ENV === 'production') {
  const pool = new Pool({ connectionString: env.DATABASE_URL })
  const adapter = new PrismaNeon(pool as any)
  prisma = new PrismaClient({ adapter })
} else {
  if (!globalForPrisma.prisma) {
    const pool = new Pool({ connectionString: env.DATABASE_URL })
    const adapter = new PrismaNeon(pool as any)
    globalForPrisma.prisma = new PrismaClient({ adapter })
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
export type PrismaClientType = typeof prisma
