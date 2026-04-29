import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Export a proxy that only creates the client when first accessed
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    if (!globalForPrisma.prisma) {
      if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set')
      }
      globalForPrisma.prisma = new PrismaClient()
    }
    return globalForPrisma.prisma[prop as keyof PrismaClient]
  },
})
