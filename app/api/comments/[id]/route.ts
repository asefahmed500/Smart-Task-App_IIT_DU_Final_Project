import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

// DELETE /api/comments/:id - Delete a comment
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { task: true }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    // Verify ownership or board manager role
    const boardMember = await prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: comment.task.boardId,
          userId: userId
        }
      }
    })

    const canDelete = comment.userId === userId || 
                    session.user.role === 'ADMIN' ||
                    (boardMember && (boardMember.role === 'ADMIN' || boardMember.role === 'MANAGER'))

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.comment.delete({
      where: { id }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'COMMENT_DELETED',
        entityType: 'Task',
        entityId: comment.taskId,
        actorId: userId,
        boardId: comment.task.boardId,
        changes: { text: comment.text },
      },
    })

    // Broadcast real-time update
    const { broadcastCommentUpdate } = await import('@/lib/socket-server')
    broadcastCommentUpdate(comment.task.boardId, comment.taskId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/comments/:id - Edit a comment
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params
    const body = await req.json()
    const { text } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 })
    }

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: { task: true }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.userId !== userId && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.comment.update({
      where: { id },
      data: { text },
      include: {
        user: { select: { id: true, name: true, avatar: true } }
      }
    })

    // Broadcast real-time update
    const { broadcastCommentUpdate } = await import('@/lib/socket-server')
    broadcastCommentUpdate(comment.task.boardId, comment.taskId)

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
