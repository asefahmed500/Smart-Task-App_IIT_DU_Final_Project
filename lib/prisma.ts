import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Export a lazy prisma proxy that only initializes on first access
export const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop, receiver) => {
    const client = getPrisma()
    return Reflect.get(client, prop, receiver)
  }
})

export type PrismaClientType = PrismaClient
