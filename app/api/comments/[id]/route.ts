import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { validateRequest } from '@/lib/api/validation-middleware'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const updateCommentSchema = z.object({
  text: z.string().min(1).max(5000).optional()
})

// PATCH /api/comments/:id - Update a comment
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params
    const validation = await validateRequest(req, updateCommentSchema)
    if (!validation.success) return validation.error

    const { text } = validation.data

    if (!text) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const existingComment = await prisma.comment.findUnique({
      where: { id },
      include: { task: { select: { boardId: true } } }
    })

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (existingComment.userId !== userId) {
      return NextResponse.json({ error: 'You can only edit your own comments' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await prisma.$transaction(async (tx: any) => {
      const comment = await tx.comment.update({
        where: { id },
        data: { text },
        include: { user: { select: { id: true, name: true, avatar: true } } }
      })

      await tx.auditLog.create({
        data: {
          action: 'COMMENT_UPDATED',
          entityType: 'Task',
          entityId: existingComment.taskId,
          actorId: userId,
          boardId: existingComment.task.boardId,
          changes: { oldText: existingComment.text, newText: text }
        }
      })

      return comment
    })

    const { broadcastCommentUpdate } = await import('@/lib/socket-server')
    broadcastCommentUpdate(existingComment.task.boardId, existingComment.taskId)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/comments/:id - Delete a comment
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const existingComment = await prisma.comment.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            boardId: true,
            board: { include: { members: true, owner: true } }
          }
        }
      }
    })

    if (!existingComment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    const isAuthor = existingComment.userId === userId
    const isAdmin = existingComment.task.board.ownerId === userId
    const isManager = existingComment.task.board.members.some(
      (m: { userId: string; role: string }) => m.userId === userId && m.role !== 'MEMBER'
    )

    if (!isAuthor && !isAdmin && !isManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await prisma.$transaction(async (tx: any) => {
      await tx.comment.delete({ where: { id } })
      await tx.auditLog.create({
        data: {
          action: 'COMMENT_DELETED',
          entityType: 'Task',
          entityId: existingComment.taskId,
          actorId: userId,
          boardId: existingComment.task.boardId,
          changes: { deletedText: existingComment.text }
        }
      })
    })

    const { broadcastCommentUpdate } = await import('@/lib/socket-server')
    broadcastCommentUpdate(existingComment.task.boardId, existingComment.taskId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
