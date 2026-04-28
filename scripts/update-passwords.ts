// Load env vars FIRST
import { config } from 'dotenv'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

import { prisma } from '../lib/prisma'
import bcrypt from 'bcrypt'

async function main() {
  console.log('Updating test user passwords...\n')

  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (admin) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10)
    await prisma.user.update({
      where: { id: admin.id },
      data: { password: hashedPassword }
    })
    console.log('✅ Admin password updated:', admin.email, '-> Admin123!')
  }

  const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } })
  if (manager) {
    const hashedPassword = await bcrypt.hash('Manager123!', 10)
    await prisma.user.update({
      where: { id: manager.id },
      data: { password: hashedPassword }
    })
    console.log('✅ Manager password updated:', manager.email, '-> Manager123!')
  }

  const member = await prisma.user.findUnique({ where: { email: 'asefahmed500@gmail.com' } })
  if (member) {
    const hashedPassword = await bcrypt.hash('Asef123!', 10)
    await prisma.user.update({
      where: { id: member.id },
      data: { password: hashedPassword }
    })
    console.log('✅ Member password updated:', member.email, '-> Asef123!')
  }

  console.log('\nAll test credentials updated:')
  console.log('  Admin: admin@test.com / Admin123!')
  console.log('  Manager: manager@test.com / Manager123!')
  console.log('  Member: asefahmed500@gmail.com / Asef123!')
}

main().catch(console.error)
