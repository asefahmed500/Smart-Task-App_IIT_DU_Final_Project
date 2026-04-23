import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id } = await params
    const body = await req.json()
    
    const existing = await prisma.webhook.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const effectiveRole = await getEffectiveBoardRole(session, existing.boardId)
    if (effectiveRole !== 'MANAGER' && effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Only managers and admins can manage webhooks' }, { status: 403 })
    }

    const webhook = await prisma.webhook.update({
      where: { id },
      data: body
    })

    return NextResponse.json(webhook)
  } catch (error) {
    console.error('Update webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id } = await params
    
    const existing = await prisma.webhook.findUnique({
      where: { id }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const effectiveRole = await getEffectiveBoardRole(session, existing.boardId)
    if (effectiveRole !== 'MANAGER' && effectiveRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Only managers and admins can manage webhooks' }, { status: 403 })
    }

    await prisma.webhook.delete({
      where: { id }
    })

    await prisma.auditLog.create({
      data: {
        action: 'WEBHOOK_DELETED',
        entityType: 'Webhook',
        entityId: id,
        actorId: session.user.id,
        boardId: existing.boardId,
        changes: { url: existing.url }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}