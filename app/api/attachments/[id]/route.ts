import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'
import { unlink } from 'fs/promises'
import { join } from 'path'

interface RouteContext {
  params: Promise<{ id: string }>
}

// DELETE /api/attachments/:id - Delete an attachment
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id },
      include: {
        task: {
          select: {
            id: true,
            boardId: true,
            board: {
              include: {
                members: true,
                owner: true
              }
            }
          }
        }
      }
    })

  if (!attachment) {
    return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
  }

  // Check board access
  const effectiveRole = await getEffectiveBoardRole(session, attachment.task.boardId)
  if (!effectiveRole) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Only uploader, admins, or managers can delete
  const canDelete = attachment.userId === userId ||
    effectiveRole === 'ADMIN' ||
    effectiveRole === 'MANAGER'

  if (!canDelete) {
    return NextResponse.json({ error: 'Forbidden - Only uploader or managers can delete' }, { status: 403 })
  }

  // Delete physical file from disk
  // Extract path from URL: /uploads/attachments/...
  const urlPath = new URL(attachment.url).pathname
  const filePath = join(process.cwd(), 'public', urlPath)

  try {
    await unlink(filePath)
  } catch (error) {
    console.warn('Failed to delete file from disk:', error)
    // Continue with DB deletion even if file delete fails
  }

  // Delete database record
  await prisma.taskAttachment.delete({
    where: { id }
  })

  return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
