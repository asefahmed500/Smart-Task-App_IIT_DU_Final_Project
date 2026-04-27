import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth } from '@/lib/session'
import { getEffectiveBoardRole } from '@/lib/board-roles'
import { Prisma } from '@prisma/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult

  try {
    const { id: boardId } = await params

    // Check board-level role (all members can view automations)
    const effectiveRole = await getEffectiveBoardRole(session, boardId)
    if (effectiveRole === null) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        automationRules: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    return NextResponse.json(board.automationRules)
  } catch (error) {
    console.error('Get automations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id: boardId } = await params
    const body = await req.json()
    const { name, trigger, condition, action } = body

    if (!name || !trigger || !action) {
      return NextResponse.json({ error: 'name, trigger, and action are required' }, { status: 400 })
    }

    // Check board-level role (not platform role)
    const effectiveRole = await getEffectiveBoardRole(session, boardId)
    if (effectiveRole === null) {
      return NextResponse.json({ error: 'Board not found or access denied' }, { status: 404 })
    }
    if (effectiveRole !== 'ADMIN' && effectiveRole !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden: Only managers and admins can create automations' }, { status: 403 })
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found' }, { status: 404 })
    }

    const rule = await prisma.automationRule.create({
      data: {
        boardId,
        name,
        trigger: typeof trigger === 'string' ? trigger : JSON.stringify(trigger),
        condition: condition ? (typeof condition === 'string' ? condition : JSON.stringify(condition)) : null,
        action: typeof action === 'string' ? action : JSON.stringify(action),
      }
    })

    await prisma.auditLog.create({
      data: {
        action: 'AUTOMATION_CREATED',
        entityType: 'AutomationRule',
        entityId: rule.id,
        actorId: userId,
        boardId,
        changes: { name, trigger, condition, action },
      },
    })

    const { broadcastAutomationUpdate } = await import('@/lib/socket-server')
    const updatedAutomations = await prisma.automationRule.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' }
    })
    broadcastAutomationUpdate(boardId, updatedAutomations)

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Create automation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}