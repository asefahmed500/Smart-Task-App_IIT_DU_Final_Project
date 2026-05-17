import { PrismaClient } from '../generated/prisma/index.js'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import bcrypt from 'bcryptjs'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function run() {
  const hp = (pw: string) => bcrypt.hashSync(pw, 10)

  const existing = await prisma.user.findMany({
    where: { email: { in: ['admin@gmail.com', 'manager@gmail.com'] } },
  })

  if (existing.length > 0) {
    console.log('Users already exist:', existing.map((u) => u.email).join(', '))
    await prisma.$disconnect()
    return
  }

  await prisma.user.create({
    data: { email: 'admin@gmail.com', password: hp('admin123'), name: 'Admin', role: 'ADMIN' },
  })
  await prisma.user.create({
    data: { email: 'manager@gmail.com', password: hp('manager123'), name: 'Manager', role: 'MANAGER' },
  })

  console.log('Created admin@gmail.com (ADMIN) and manager@gmail.com (MANAGER)')
  await prisma.$disconnect()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
