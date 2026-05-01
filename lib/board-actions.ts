'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function getBoardData(boardId: string) {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: {
      columns: {
        orderBy: { order: 'asc' },
        include: {
          tasks: {
            orderBy: { createdAt: 'desc' },
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  email: true,
                  role: true
                }
              },
              _count: {
                select: {
                  comments: true,
                  attachments: true,
                  checklists: true
                }
              },
              checklists: {
                include: {
                  items: true
                }
              }
            }
          }
        }
      },
      members: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true
        }
      }
    }
  })

  if (!board) {
    return null
  }

  // Check if user is member or admin
  const isMember = board.members.some(m => m.id === session.id)
  const isAdmin = session.role === 'ADMIN'

  if (!isMember && !isAdmin) {
    throw new Error('Unauthorized: You are not a member of this board')
  }

  return board
}

export async function createBoard(data: { name: string, description?: string }) {
  const session = await getSession()
  if (!session || session.role === 'MEMBER') {
    throw new Error('Unauthorized: Only Admins and Managers can create boards')
  }

  const board = await prisma.board.create({
    data: {
      ...data,
      ownerId: session.id,
      members: {
        connect: { id: session.id }
      },
      columns: {
        create: [
          { name: 'To Do', order: 0 },
          { name: 'In Progress', order: 1 },
          { name: 'Done', order: 2 }
        ]
      }
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'CREATE_BOARD',
      details: { boardId: board.id, name: board.name },
    }
  })

  revalidatePath('/dashboard')
  revalidatePath('/admin/boards')
  return board
}

export async function updateBoard(boardId: string, data: { name: string, description?: string }) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true }
  })

  if (!board) throw new Error('Board not found')

  const isAdmin = session.role === 'ADMIN'
  const isOwner = board.ownerId === session.id

  if (!isAdmin && !isOwner) {
    throw new Error('Unauthorized: Only the owner or an admin can edit this board')
  }

  const updatedBoard = await prisma.board.update({
    where: { id: boardId },
    data
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'UPDATE_BOARD',
      details: { boardId, ...data },
    }
  })

  revalidatePath(`/dashboard/board/${boardId}`)
  revalidatePath('/dashboard')
  revalidatePath('/admin/boards')
  return updatedBoard
}

export async function deleteBoard(boardId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true }
  })

  if (!board) throw new Error('Board not found')

  if (session.role !== 'ADMIN' && board.ownerId !== session.id) {
    throw new Error('Unauthorized: Only the owner or an admin can delete this board')
  }

  await prisma.board.delete({
    where: { id: boardId }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'DELETE_BOARD',
      details: { boardId },
    }
  })

  revalidatePath('/dashboard')
  revalidatePath('/admin/boards')
}

export async function createColumn(boardId: string, name: string) {
  const session = await getSession()
  if (!session || session.role === 'MEMBER') {
    throw new Error('Unauthorized: Only Admins and Managers can create columns')
  }

  // Get current max order
  const lastColumn = await prisma.column.findFirst({
    where: { boardId },
    orderBy: { order: 'desc' }
  })

  const order = lastColumn ? lastColumn.order + 1 : 0

  const column = await prisma.column.create({
    data: {
      name,
      order,
      boardId
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'CREATE_COLUMN',
      details: { boardId, columnId: column.id, name },
    }
  })

  revalidatePath(`/dashboard/board/${boardId}`)
  return column
}

export async function deleteColumn(columnId: string, boardId: string, targetColumnId?: string) {
  const session = await getSession()
  if (!session || session.role === 'MEMBER') {
    throw new Error('Unauthorized: Only Admins and Managers can delete columns')
  }

  // If no target column provided, find the first available column that isn't this one
  let finalTargetId = targetColumnId

  if (!finalTargetId) {
    const otherColumn = await prisma.column.findFirst({
      where: { 
        boardId,
        id: { not: columnId }
      },
      orderBy: { order: 'asc' }
    })
    finalTargetId = otherColumn?.id
  }

  if (finalTargetId) {
    // Move tasks to the target column
    await prisma.task.updateMany({
      where: { columnId },
      data: { columnId: finalTargetId }
    })
  }

  await prisma.column.delete({
    where: { id: columnId }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'DELETE_COLUMN',
      details: { boardId, columnId, rehomedTo: finalTargetId },
    }
  })

  revalidatePath(`/dashboard/board/${boardId}`)
}

export async function updateColumnWipLimit(columnId: string, wipLimit: number, boardId: string) {
  const session = await getSession()
  if (!session || session.role === 'MEMBER') {
    throw new Error('Unauthorized: Only Admins and Managers can update WIP limits')
  }

  await prisma.column.update({
    where: { id: columnId },
    data: { wipLimit }
  })

  revalidatePath(`/dashboard/board/${boardId}`)
}

export async function updateColumn(columnId: string, name: string, boardId: string) {
  const session = await getSession()
  if (!session || session.role === 'MEMBER') {
    throw new Error('Unauthorized: Only Admins and Managers can rename columns')
  }

  await prisma.column.update({
    where: { id: columnId },
    data: { name }
  })

  revalidatePath(`/dashboard/board/${boardId}`)
}

export async function reorderColumns(boardId: string, columnIds: string[]) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  // Bulk update orders
  await Promise.all(
    columnIds.map((id, index) =>
      prisma.column.update({
        where: { id },
        data: { order: index }
      })
    )
  )

  revalidatePath(`/dashboard/board/${boardId}`)
}

export async function searchUsers(query: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  return await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true
    }
  })
}

export async function addBoardMember(boardId: string, userId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true }
  })

  if (!board) throw new Error('Board not found')
  
  const isAdmin = session.role === 'ADMIN'
  const isOwner = board.ownerId === session.id

  if (!isAdmin && !isOwner) {
    throw new Error('Unauthorized: Only the owner or an admin can add members')
  }

  await prisma.board.update({
    where: { id: boardId },
    data: {
      members: {
        connect: { id: userId }
      }
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'ADD_BOARD_MEMBER',
      details: { boardId, addedUserId: userId },
    }
  })

  revalidatePath(`/dashboard/board/${boardId}`)
}

export async function removeBoardMember(boardId: string, userId: string) {
  const session = await getSession()
  if (!session) throw new Error('Unauthorized')

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true }
  })

  if (!board) throw new Error('Board not found')
  
  const isAdmin = session.role === 'ADMIN'
  const isOwner = board.ownerId === session.id

  if (!isAdmin && !isOwner) {
    throw new Error('Unauthorized: Only the owner or an admin can remove members')
  }

  if (userId === board.ownerId) {
    throw new Error('Cannot remove the board owner')
  }

  await prisma.board.update({
    where: { id: boardId },
    data: {
      members: {
        disconnect: { id: userId }
      }
    }
  })

  await prisma.auditLog.create({
    data: {
      userId: session.id,
      action: 'REMOVE_BOARD_MEMBER',
      details: { boardId, removedUserId: userId },
    }
  })

  revalidatePath(`/dashboard/board/${boardId}`)
}
