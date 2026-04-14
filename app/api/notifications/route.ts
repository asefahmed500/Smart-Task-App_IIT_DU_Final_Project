import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'

// GET /api/notifications - Get user's notifications
export async function GET(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const userId = authResult.user.id

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notifications - Mark all as read
export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const userId = authResult.user.id

  try {
    const body = await req.json()

    if (body.markAllAsRead) {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
