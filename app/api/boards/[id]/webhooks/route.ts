import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id: boardId } = await params

    const effectiveRole = await getEffectiveBoardRole(session, boardId)
    if (effectiveRole === null) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }
    if (effectiveRole === 'MEMBER') {
      return NextResponse.json({ error: 'Forbidden: Only managers and admins can manage webhooks' }, { status: 403 })
    }

    const webhooks = await prisma.webhook.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(webhooks)
  } catch (error) {
    console.error('Get webhooks error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id: boardId } = await params
    const body = await req.json()
    const { name, url, secret, events } = body

    if (!name || !url || !events || !Array.isArray(events)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const effectiveRole = await getEffectiveBoardRole(session, boardId)
    if (effectiveRole === null) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }
    if (effectiveRole === 'MEMBER') {
      return NextResponse.json({ error: 'Forbidden: Only managers and admins can manage webhooks' }, { status: 403 })
    }

    const webhook = await prisma.webhook.create({
      data: {
        boardId,
        url,
        secret,
        events,
        isActive: true
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'WEBHOOK_CREATED',
        entityType: 'Webhook',
        entityId: webhook.id,
        actorId: session.user.id,
        boardId,
        changes: { name, url }
      }
    })

    return NextResponse.json(webhook)
  } catch (error) {
    console.error('Create webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}