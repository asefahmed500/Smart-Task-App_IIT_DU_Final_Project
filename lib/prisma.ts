import { PrismaClient } from '@prisma/client'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  })
  prisma = new PrismaClient({ adapter })
} else {
  if (!globalForPrisma.prisma) {
    const adapter = new PrismaNeon({
      connectionString: process.env.DATABASE_URL,
    })
    globalForPrisma.prisma = new PrismaClient({ adapter })
  }
  prisma = globalForPrisma.prisma
}

export { prisma }
export type PrismaClientType = typeof prisma
