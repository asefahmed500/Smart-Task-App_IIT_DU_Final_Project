import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireApiAuth, requireApiRole } from '@/lib/session'
import { Prisma } from '@prisma/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/boards/:id/automations - List automation rules (all board members)
export async function GET(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiAuth()
  if (authResult instanceof NextResponse) return authResult
  const session = authResult
  const userId = session.user.id

  try {
    const { id: boardId } = await params

    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } }
        ]
      },
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

// POST /api/boards/:id/automations - Create automation rule (Manager/Admin only)
export async function POST(req: NextRequest, { params }: RouteContext) {
  const authResult = await requireApiRole(['MANAGER', 'ADMIN'])
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

    // Verify user has access to this board (owner or manager/admin)
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
                role: { in: ['ADMIN', 'MANAGER'] }
              }
            }
          }
        ]
      }
    })

    if (!board) {
      return NextResponse.json({ error: 'Board not found or insufficient permissions' }, { status: 404 })
    }

    const rule = await prisma.automationRule.create({
      data: {
        boardId,
        name,
        trigger: JSON.stringify(trigger),
        condition: condition ? JSON.stringify(condition) : Prisma.JsonNull,
        action: JSON.stringify(action),
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

    return NextResponse.json(rule)
  } catch (error) {
    console.error('Create automation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
