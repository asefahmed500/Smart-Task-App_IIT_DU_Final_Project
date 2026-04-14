import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params
    
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id },
      include: { task: true }
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Only owner or manager/admin can delete
    if (attachment.userId !== userId && session.user.role === 'MEMBER') {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.taskAttachment.delete({ where: { id } })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'ATTACHMENT_DELETED',
        entityType: 'Task',
        entityId: attachment.taskId,
        actorId: userId,
        changes: { name: attachment.name }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete attachment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
