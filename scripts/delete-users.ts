import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pkg from 'pg'
const { Pool } = pkg

config({ path: '.env.local' })
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

await prisma.user.deleteMany({
  where: {
    email: {
      contains: 'test.com',
    },
  },
})
console.log('Deleted test users')
await prisma.$disconnect()
