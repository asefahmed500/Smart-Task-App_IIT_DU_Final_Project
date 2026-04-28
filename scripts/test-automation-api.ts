import { prisma } from '../lib/prisma'

async function main() {
  const boardId = 'cmogr3mhw0003eoyockv4js3a' // Development Board
  const taskId = 'cmoi1mo3e0000lsyozdztkmlm' // Test automation trigger

  // Get columns
  const backlog = await prisma.column.findFirst({
    where: { name: 'Backlog', boardId }
  })

  const inProgress = await prisma.column.findFirst({
    where: { name: 'In Progress', boardId }
  })

  if (!backlog || !inProgress) {
    console.log('Columns not found')
    return
  }

  // Get task
  const task = await prisma.task.findUnique({
    where: { id: taskId }
  })

  if (!task) {
    console.log('Task not found')
    return
  }

  console.log('Current column:', backlog.id === task.columnId ? 'Backlog' : 'Other')
  console.log('In Progress column ID:', inProgress.id)
  console.log('Current assignee:', task.assigneeId || 'None')

  // Move task back to Backlog if it's in In Progress
  if (task.columnId === inProgress.id) {
    await prisma.task.update({
      where: { id: taskId },
      data: {
        columnId: backlog.id,
        assigneeId: null, // Clear assignee
        version: { increment: 1 }
      }
    })
    console.log('Moved back to Backlog, cleared assignee')
  }

  // Now we need to use the API to move it to In Progress
  console.log('\nNow use curl to call the move API:')
  console.log(`curl -X PATCH http://localhost:3000/api/tasks/${taskId}/move \\
  -H "Content-Type: application/json" \\
  -H "Cookie: auth_token=<YOUR_TOKEN>" \\
  -d '{"targetColumnId":"${inProgress.id}","newPosition":0,"version":${task.version + 1}}'`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
