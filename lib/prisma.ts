import { PrismaClient } from '@prisma/client'
import { neonConfig } from '@neondatabase/serverless'
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

let _prisma: PrismaClient | null = null

export function getPrisma(): PrismaClient {
  if (_prisma) return _prisma

  const env = getEnv()

  // If we're on the server and DATABASE_URL is missing, we still try to initialize
  // but it will throw a descriptive error when used, rather than crashing the whole module.
  if (typeof window === 'undefined' && !env.DATABASE_URL) {
    console.warn('DATABASE_URL is not defined. Prisma client will likely fail on first query.')
  }

  if (process.env.NODE_ENV === 'production') {
    console.log(`[Prisma] Initializing production client... URL starts with: ${env.DATABASE_URL?.substring(0, 15)}`)
    const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL })
    _prisma = new PrismaClient({ adapter })
  } else {
    if (!globalForPrisma.prisma) {
      console.log(`[Prisma] Initializing development client... URL starts with: ${env.DATABASE_URL?.substring(0, 15)}`)
      const adapter = new PrismaNeon({ connectionString: env.DATABASE_URL })
      globalForPrisma.prisma = new PrismaClient({ adapter })
    }
    _prisma = globalForPrisma.prisma
  }

  return _prisma
}

// Export a lazy prisma proxy that only initializes on first access
export const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop, receiver) => {
    const client = getPrisma()
    return Reflect.get(client, prop, receiver)
  }
})

export type PrismaClientType = PrismaClient
