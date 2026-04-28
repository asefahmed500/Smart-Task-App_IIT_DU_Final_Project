import { prisma } from '../lib/prisma'

async function main() {
  const taskId = 'cmoi1unvj0001ccyophomtx7v' // Task B
  const managerId = 'cmogr3ldz0001eoyordrpq72o' // Manager

  // Create a test attachment (simulating an uploaded file)
  const attachment = await prisma.taskAttachment.create({
    data: {
      name: 'test-document.txt',
      url: '/uploads/attachments/test-document.txt',
      type: 'text/plain',
      size: 1024,
      taskId,
      userId: managerId
    },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  })

  console.log('Created attachment:', attachment.id)
  console.log('Name:', attachment.name)
  console.log('URL:', attachment.url)
  console.log('Type:', attachment.type)
  console.log('Size:', attachment.size)
  console.log('Uploaded by:', attachment.user.name)

  // Get all attachments for the task
  const attachments = await prisma.taskAttachment.findMany({
    where: { taskId },
    include: {
      user: { select: { name: true, email: true } }
    }
  })

  console.log('\n\nAll attachments for task:', attachments.length)
  attachments.forEach(a => {
    console.log(`- ${a.name} (${a.type}) by ${a.user.name}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
