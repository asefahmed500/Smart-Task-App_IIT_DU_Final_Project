import { prisma } from '../lib/prisma.js'

async function main() {
  console.log('Starting cleanup...')
  
  // Delete in correct order due to foreign key constraints
  await prisma.taskBlock.deleteMany({})
  console.log('Deleted task blocks')
  
  await prisma.timeLog.deleteMany({})
  console.log('Deleted time logs')
  
  await prisma.taskAttachment.deleteMany({})
  console.log('Deleted task attachments')
  
  await prisma.comment.deleteMany({})
  console.log('Deleted comments')
  
  await prisma.task.deleteMany({})
  console.log('Deleted tasks')
  
  await prisma.notification.deleteMany({})
  console.log('Deleted notifications')
  
  await prisma.boardMember.deleteMany({})
  console.log('Deleted board members')
  
  await prisma.automationRule.deleteMany({})
  console.log('Deleted automation rules')
  
  await prisma.column.deleteMany({})
  console.log('Deleted columns')
  
  await prisma.board.deleteMany({})
  console.log('Deleted boards')
  
  await prisma.auditLog.deleteMany({})
  console.log('Deleted audit logs')
  
  await prisma.session.deleteMany({})
  console.log('Deleted sessions')
  
  await prisma.account.deleteMany({})
  console.log('Deleted accounts')
  
  await prisma.user.deleteMany({})
  console.log('Deleted users')
  
  await prisma.verification.deleteMany({})
  console.log('Deleted verification records')
  
  console.log('All data deleted successfully')
}

main().catch(console.error)
