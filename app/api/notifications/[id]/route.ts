import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/notifications/:id - Mark as read/unread (own notifications only)
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params
    const body = await req.json()
    const { read } = body

    const notification = await prisma.notification.findUnique({ where: { id } })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (notification.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: read !== undefined ? read : true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/notifications/:id - Delete own notification
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id } = await params

    const notification = await prisma.notification.findUnique({ where: { id } })

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }

    if (notification.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.notification.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
