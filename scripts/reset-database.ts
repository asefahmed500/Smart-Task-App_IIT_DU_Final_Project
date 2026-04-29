import { prisma } from '../lib/prisma'

// Load environment variables
await import('dotenv').then((m) => m.config({ path: '.env.local' }))

async function resetDatabase() {
  console.log('🔄 Starting database reset...')

  // Delete all data in correct order due to foreign key constraints
  const tables = [
    'TimeLog',
    'TaskAttachment',
    'Comment',
    'TaskBlock',
    'Task',
    'AutomationRule',
    'BoardMember',
    'Notification',
    'Webhook',
    'Column',
    'Board',
    'Verification',
    'RateLimit',
    'Session',
    'Account',
    'User',
  ] as const

  for (const table of tables) {
    try {
      // @ts-ignore - dynamic table deletion
      await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`)
      console.log(`✅ Cleared ${table}`)
    } catch (error) {
      console.log(`⚠️  Skipped ${table}: ${(error as Error).message}`)
    }
  }

  // Reset sequences
  try {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "User_id_seq" RESTART WITH 1`)
    console.log('✅ Reset User_id_seq')
  } catch (error) {
    console.log(`⚠️  Skipped sequence reset: ${(error as Error).message}`)
  }

  console.log('✅ Database reset complete!')
}

resetDatabase()
  .catch((error) => {
    console.error('❌ Error resetting database:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
